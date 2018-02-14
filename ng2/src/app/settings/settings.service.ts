import { Injectable, Inject } from '@angular/core'
import { BackendService } from '../backend/backend.service'
import { IFileBackend, FileServiceToken } from '../resources'
import { KMXUtil } from '../util/kmxutil'
import { Subject, ReplaySubject } from 'rxjs/Rx'

export class Machine {
  private static mcodes = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'S']
  private static mcodesSpecial = ['M30', 'Cycle Start', 'Halt', 'Stop', 'Feedhold', 'Resume', 'Prog Start', 'Prog Exit']
  private static mcodesExtended = ['M100', 'M101', 'M102', 'M103', 'M104', 'M105', 'M106', 'M107', 'M108', 'M109', 'M110', 'M111', 'M112', 'M113', 'M114', 'M115', 'M116', 'M117', 'M118', 'M119']

  name: string
  dimX: number
  dimY: number
  dimZ: number
  initProgram: string
  initThread: number
  description: string
  axes: Axis[]
  tplanner: TPlanner
  actions: Action[]
  specialActions: Action[]
  extendedActions: Action[]
  userActions: Action[]

  constructor() {
    this.update({} as Machine)
  }

  update(from: Machine) {
    this.name = from.name || null
    this.description = from.description || null
    this.dimX = from.dimX || 0
    this.dimY = from.dimY || 0
    this.dimZ = from.dimZ || 0
    this.initProgram = from.initProgram || null
    this.initThread = from.initThread || 1 //TODO remove this property
    this.axes = from.axes || Machine.axesArr()
    this.tplanner = from.tplanner || new TPlanner()
    this.actions = Machine.actionsArr(from.actions, Machine.mcodes)
    this.specialActions = Machine.actionsArr(from.specialActions, Machine.mcodesSpecial)
    this.extendedActions = Machine.actionsArr(from.extendedActions, Machine.mcodesExtended)
    this.userActions = from.userActions || Machine.userActionsArr()
  }

  public static axesArr(): Axis[] {
    const axes = []
    const axisNames = ['X', 'Y', 'Z', 'A', 'B', 'C']
    for (let i = 0; i < 6; i++) {
      axes.push(new Axis(axisNames[i]))
    }
    return axes
  }

  public static actionsArr(existingActions: Action[], codes: string[]) {

    const actions = existingActions || []
    for(const codeName of codes) {
      let found = false
      for(const action of actions) {
        if (action.name === codeName) {
          found = true
          break
        }
      }
      if (!found) {
        actions.push({
          action: 0,
          name: codeName
        })
      }
    }
    //Remove faulty named actions
    let idx = actions.length
    while (idx--) {
      if (codes.indexOf(actions[idx].name) < 0) {
        actions.splice(idx, 1)
      }
    }

    actions.sort(function compare(a, b) {
      return codes.indexOf(a.name) - codes.indexOf(b.name)
    })
    return actions
  }

  public static userActionsArr() {
    const actions = []
    for (let i = 0; i < 10; i++) {
      actions.push({
        action: 0
      })

    }
    return actions
  }

}
export class Axis {
  name: string
  countsPerUnit: number
  maxAccel: number
  maxVel: number
  jogVel: number
  constructor(name: string) {
    this.name = name
  }
}
export class Action {
  action: number
  name: string
  dParam0?: number
  dParam2?: number
  dParam3?: number
  dParam1?: number
  file?: string
}
export class TPlanner {
  breakangle: number
  cornertolerance: number
  lookahead: number
  collineartolerance: number
  facetangle: number
}

@Injectable()
export class SettingsService {
  private machine: Machine
  public subject: Subject<Machine>
  constructor(
    private kmxBackend: BackendService,
    @Inject(FileServiceToken) private fileBackend: IFileBackend) {
    this.machine = new Machine()    
    this.subject = new ReplaySubject<Machine>(1)
    this.load('./settings/machines/laser.cnf')
  }
  public save(): void {
    const file = this.fileName()
    this.fileBackend.saveFile(file, JSON.stringify(this.machine, null, '  ')).subscribe(
      () => {
        this.subject.next(this.machine)
        this.kmxBackend.onUpdateMotionParams()
      })
  }
  public load(file) {

    this.fileBackend.loadFile(file).subscribe(
      (payload) => {
        this.machine.update(payload.json())
        this.subject.next(this.machine)
      },
      err => {
        console.error(err)
        this.subject.next(this.machine)
      },
      () => console.log('File loaded: ' + file)
    )
  }
  public fileName(): string {
    return 'settings/machines/' + this.machine.name + '.cnf'
  }

}
