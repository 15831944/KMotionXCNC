import { IGMDriver, GCodeSource } from '../model/igm';
import { ModelTransformer } from './model.transformer';
class GCodeOutput {
    constructor(spindleOnCommand, spindleOffCommand, filter) {
        this.spindleOnCommand = spindleOnCommand;
        this.spindleOffCommand = spindleOffCommand;
        this.filter = filter;
        this.code = [];
    }
    spindleOn() {
        this.push(this.spindleOnCommand);
    }
    spindleOff() {
        this.push(this.spindleOffCommand);
    }
    comment(text) {
        this.push('(' + text + ')');
    }
    //lägg till 
    move(type, X) {
    }
    push(gc) {
        let line;
        //TODO handle other types as well
        if (Array.isArray(gc)) {
            line = gc.join(' ');
        }
        else {
            line = gc;
        }
        if (this.filter) {
            //filter duplicate lines
            if (this.code[this.code.length - 1] !== line) {
                this.code.push(line);
            }
        }
        else {
            this.code.push(line);
        }
    }
}
export class Igm2GcodeTransformer extends ModelTransformer {
    constructor(settings) {
        super();
        this.settings = settings;
    }
    execute(igm, targetObserver) {
        const settings = this.settings;
        //settings.seekRate = settings.seekRate || 800;
        //settings.bitWidth = settings.bitWidth || 1; // in mm 
        const multipass = false; //false when lasering in one pass
        const driver = new IGMDriver(igm);
        const shapes = driver.applyModifications(settings);
        //var LaserON = '(BUF,SetBitBuf14)';
        //var LaserOFF = '(BUF,ClearBitBuf14)';
        const gcode = new GCodeOutput('M3 (laser on)', 'M5 (laser off)', true);
        const maxBounds = driver.getMaxBounds(shapes);
        gcode.comment(this.describe(maxBounds));
        gcode.push('G90'); //Absolute Coordinates
        const unitGCode = {
            mm: 'G21',
            in: 'G20'
        };
        //G20 Inch units
        //G21 mm units
        gcode.push(unitGCode[settings.unit]);
        if (settings.initCode) {
            //TODO use IGM material setting (currently non existing)
            gcode.push(settings.initCode);
        }
        gcode.push('F' + settings.feedRate);
        if (multipass) {
            gcode.push('G0 Z' + this.scaleNoDPI(settings.safeZ));
        }
        for (const shape of shapes) {
            //Given that the IGM in the future might contain move shapes (G0)
            //if shape is of type move(G0) then no G0 should be inserted
            // moving around fixtures etc
            //Also handle other type of shapes circle and arcs. 
            //this will remove the need of converting to vectors when importing from DXF SVG etc
            //add scale and transform
            const startPoint = shape.vectors[0];
            gcode.spindleOff();
            // seek to index 0
            //gcode.push('N 100 ');
            gcode.push([
                'G0',
                'X' + this.format(startPoint.x),
                'Y' + this.format(startPoint.y)
            ]);
            if (multipass) {
                this.passCut(shape, gcode);
            }
            else {
                gcode.comment(this.describe(shape.bounds));
                gcode.spindleOn();
                for (const point of shape.vectors) {
                    gcode.push([
                        'G1',
                        'X' + this.format(point.x),
                        'Y' + this.format(point.y)
                    ]);
                }
            }
            gcode.spindleOff();
            if (multipass) {
                // go safe
                gcode.push(['G0',
                    'Z' + this.scaleNoDPI(settings.safeZ)
                ]);
            }
        }
        // just wait there for a second
        //gcode.push('G4 P1');
        // turn off the spindle
        //gcode.push('M5');
        // go home
        if (multipass) {
            gcode.push('G0 Z0');
        }
        gcode.push('G0 X0 Y0');
        gcode.push('M2');
        targetObserver.next(new GCodeSource(gcode.code));
    }
    /**
     * Cut material in several passes. Do reverse passes if shape is not closed
     */
    passCut(shape, gcode) {
        const settings = this.settings;
        const passWidth = settings.materialWidth / settings.passes;
        const path = shape.vectors;
        const startPoint = path[0];
        for (let p = passWidth; p <= settings.materialWidth; p += passWidth) {
            gcode.comment('Forward pass depth ' + p);
            // begin the cut by dropping the tool to the work
            gcode.push([
                'G0',
                'Z' + this.scaleNoDPI(settings.cutZ + p)
            ]);
            gcode.comment(this.describe(shape.bounds));
            gcode.spindleOn();
            // keep track of the current path being cut, as we may need to reverse it
            const localPath = [];
            for (let segmentIdx = 0, segmentLength = path.length; segmentIdx < segmentLength; segmentIdx++) {
                //add transform
                const segment = path[segmentIdx]; //.add(translateVec,true);
                const localSegment = [
                    'G1',
                    'X' + this.format(segment.x),
                    'Y' + this.format(segment.y) /*,
                      'F' + settings.feedRate*/
                ].join(' ');
                // feed through the material
                gcode.push(localSegment);
                localPath.push(localSegment);
                // if the path is not closed, reverse it, drop to the next cut depth and cut
                // this handles lines
                if (segmentIdx === segmentLength - 1) {
                    if (segment.x !== startPoint.x || segment.y !== startPoint.y) {
                        p += passWidth;
                        if (p <= settings.materialWidth) {
                            gcode.comment('Reverse pass depth ' + p);
                            // begin the cut by dropping the tool to the work
                            gcode.push(['G0',
                                'Z' + this.scaleNoDPI(settings.cutZ + p)
                            ]);
                            //this fails now
                            //Array.prototype.push.apply(gcode, localPath.reverse());
                            //TODO  Must use something like this. or even better use push function on  
                            Array.prototype.push.apply(gcode.code, localPath.reverse());
                        }
                    }
                }
            }
        }
    }
    scaleNoDPI(val) {
        //TODO only used for tool moves. maybe scale should be inverted to avoid z scaling
        return this.format(val * this.settings.scale);
    }
    describe(rect) {
        return 'Width: ' + this.format(rect.width()) + ' Height: ' + this.format(rect.height()) + ' Area: ' + this.format(rect.area());
    }
    format(numb) {
        //fix fractional digits
        numb = +numb.toFixed(this.settings.fractionalDigits);
        // Note the plus sign that drops any 'extra' zeroes at the end.
        // It changes the result (which is a string) into a number again (think '0 + foo'),
        // which means that it uses only as many digits as necessary.
        return numb;
    }
}
//# sourceMappingURL=igm-gcode.transformer.js.map