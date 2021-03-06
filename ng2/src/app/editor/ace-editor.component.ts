import { Component, Inject, Input, ViewChild, ViewEncapsulation } from '@angular/core'
import { AceDirective } from './ace.directive'
import {
  FileDialogComponent,
  FileResource,
  Payload,
  FileStoreToken,
  FileStore
} from '../resources'

@Component({
  selector: 'code-editor',
  templateUrl: './ace-editor.component.html',
  styleUrls: ['./ace-editor.component.css'],
  encapsulation: ViewEncapsulation.None

})
export class AceEditorComponent {
  @ViewChild(AceDirective, {static: false})
  private aceEditor: AceDirective

  //not used?
  @ViewChild(FileDialogComponent, {static: false})
  private resourceComponent: FileDialogComponent

  @Input() mode: string
  @Input() theme: string
  resource: FileResource
  dirty: boolean

  constructor( @Inject(FileStoreToken) private fileStore: FileStore) {
    this.resource = new FileResource('')

    this.fileStore.textSubject.subscribe(text => {
      this.textContent = text
      this.dirty = false
    },
      err => console.error(err)
    )
  }
  selectRow(row: number){
    this.aceEditor.selectRow(row)
  }
  
  get textContent() {
    return this.aceEditor.text
  }
  set textContent(value: string) {
    this.aceEditor.text = value
    this.dirty = true
  }

  onContentChange(change: any /*AceAjax.EditorChangeEvent*/) {
    //console.log('onContentChange', change);
    //TODO Gcode need to be aware of this in order update 3d view
    this.dirty = true
  }

  onSave() {
    this.fileStore.store(this.resource.canonical, this.textContent)
    this.dirty = false
  }

  onSaveAs(resource: FileResource) {
    //console.log(this.resource, resource)
    this.onSave()
}

  onFile(file: FileResource | Payload) {
    if (file instanceof FileResource) {
      this.resource = file
    } else {
      //Use imported name
      this.resource.canonical = file.name
    }
    //Selected in file dialog or drop imported file
    //load() should be responsible for returning file resource.
    //then imported files can be saved and get a real name
    this.fileStore.load(file)

  }

}