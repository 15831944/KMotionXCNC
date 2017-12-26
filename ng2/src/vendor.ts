// Angular
import '@angular/platform-browser';
import '@angular/platform-browser-dynamic';
import '@angular/core';
import '@angular/common';
import '@angular/forms';
import '@angular/common/http';
import '@angular/router';
// RxJS
import 'rxjs';
// Other vendors for example jQuery, Lodash or Bootstrap
// You can import js, ts, css, sass, ...

import 'ngx-bootstrap/dropdown'
import 'ngx-bootstrap/tabs'

import 'opentype.js'
import 'pdfjs-dist/build/pdf.js'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/css/bootstrap-theme.min.css'
import '../public/css/style.css'

//https://stackoverflow.com/questions/35968047/using-webpack-threejs-examples-and-typescript
//THREE is modular but not the TrackballControls example
// imports-loader provides THREE to the TrackballControls example
// exports-loader gets THREE.TrackballControls
import * as THREE from 'three';
//import THREE from 'three';
import 'imports-loader?THREE=three!three/examples/js/controls/TrackballControls';

import 'script-loader!dxf-parser/dist/dxf-parser.js'

//Modular ace implementation
import 'brace'
import 'brace/mode/c_cpp'
import 'brace/mode/gcode'
import 'brace/theme/chrome'
import 'brace/ext/settings_menu'
import 'brace/ext/searchbox'
