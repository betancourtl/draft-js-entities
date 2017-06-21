import React from 'react';
import { Editor, convertToRaw, CompositeDecorator } from 'draft-js';
import Raw from 'draft-js-raw-content-state';
import {
  LinkEntityDecorator,
  linkStrategy,
  colorStrategy,
  ColorEntityDecorator,
  link,
  color,
} from '../src';

const decorators = new CompositeDecorator([
  {
    strategy: linkStrategy,
    component: LinkEntityDecorator,
  },
  {
    strategy: colorStrategy,
    component: ColorEntityDecorator,
  },
]);

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
    const mergeLink = () => this.updateEditorState(linkEntity.merge({ url: 'http://pbnation.com' }));
    const setLink = () => this.updateEditorState(linkEntity.set({ url: 'http://google.com' }));

    const colorEntity = color(editorState);
    const createColor = () => this.updateEditorState(colorEntity.create({ color: 'red' }));
    const removeColor = () => this.updateEditorState(colorEntity.remove());
    const mergeColor = () => this.updateEditorState(colorEntity.merge({ color: 'blue' }));
    const setColor = () => this.updateEditorState(colorEntity.set({ color: 'green' }));

    return (
      <div style={{
        display: 'flex',
        padding: '15px',
        maxWidth: '1000px',
        justifyContent: 'center',
        margin: '0 auto',
      }}>
        <div style={{ flex: '0 0 200px' }}>
          <div>
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
          <div>
            <h2>Colors</h2>
            <button onClick={createColor}>
              <span>red</span>
            </button>
            <button onClick={mergeColor}>
              <span>blue</span>
            </button>
            <button onClick={setColor}>
              <span>green</span>
            </button>
            <button onClick={removeColor}>
              <span>Remove</span>
            </button>
          </div>
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
