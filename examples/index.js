import React from 'react';
import { Editor, convertToRaw } from 'draft-js';
import Raw from 'draft-js-raw-content-state';

class RichEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: new Raw().addBlock('Hello World', 'header-two').toEditorState(),
      readOnly: false,
    };
    this.updateEditorState = editorState => this.setState({ editorState });
  }

  render() {
    const { editorState } = this.state;
    return (
      <div style={{
        display: 'flex',
        padding: '15px',
        maxWidth: '1000px',
        justifyContent: 'center',
        margin: '0 auto',
      }}>
        <div style={{ flex: 1 }}>
          <h2>Draft-JS Editor</h2>
          <Editor
            editorState={editorState}
            onChange={this.updateEditorState}
            onTab={this.onTab}
            placeholder="Tell a story..."
            readOnly={this.state.readOnly}
            spellCheck
          />
        </div>
        <div style={{ flex: '1' }}>
          <h2>ContentState</h2>
          <div>
            <pre>
              {JSON.stringify(convertToRaw(this.state.editorState.getCurrentContent()), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}

export default RichEditor;
