import React from 'react';
import { Editor, convertToRaw, CompositeDecorator } from 'draft-js';
import Raw from 'draft-js-raw-content-state';
import { LinkEntityDecorator, linkStrategy, link } from '../src';

const decorators = new CompositeDecorator([{
  strategy: linkStrategy,
  component: LinkEntityDecorator,
}]);

class RichEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: new Raw()
        .addBlock('Hello World', 'header-two')
        .toEditorState(decorators),
      readOnly: false,
    };
    this.updateEditorState = editorState => this.setState({ editorState });
  }

  render() {
    const { editorState } = this.state;
    const linkEntity = link(editorState);
    const createLink = () => this.updateEditorState(linkEntity.create({ color: 'red' }));
    const removeLink = () => this.updateEditorState(linkEntity.remove());
    const mergeLink = () => this.updateEditorState(linkEntity.merge({ url: 'pbnation.com' }));
    const setLink = () => this.updateEditorState(linkEntity.set({ url: 'google.com' }));

    return (
      <div style={{
        display: 'flex',
        padding: '15px',
        maxWidth: '1000px',
        justifyContent: 'center',
        margin: '0 auto',
      }}>
        <div style={{ flex: '0 0 200px' }}>
          <h2>Links</h2>
          <button onClick={createLink}>
            <span>Create</span>
          </button>
          <button onClick={setLink}>
            <span>Set</span>
          </button>
          <button onClick={mergeLink}>
            <span>Merge</span>
          </button>
          <button onClick={removeLink}>
            <span>Remove</span>
          </button>
        </div>
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
