import React from 'react';
import PropTypes from 'prop-types';
import { EditorState, Modifier, CharacterMetadata } from 'draft-js';
import { Map } from 'immutable';

// utils

// This functionality has been taken from draft-js and modified for re-usability purposes.
// Maps over the selected characters, and applies a function to each character.
// Characters are of type CharacterMetadata. Look up the draftJS API to see what
// operations can be performed on characters. You must return the characters back
// so they can be merged into the block.
export const mapSelectedCharacters = callback => editorState => {
  const contentState = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();
  const blockMap = contentState.getBlockMap();
  const startKey = selectionState.getStartKey();
  const startOffset = selectionState.getStartOffset();
  const endKey = selectionState.getEndKey();
  const endOffset = selectionState.getEndOffset();

  const newBlocks = blockMap.skipUntil((_, k) => {
    return k === startKey;
  }).takeUntil((_, k) => {
    return k === endKey;
  }).concat(Map([[endKey, blockMap.get(endKey)]])).map((block, blockKey) => {
    let sliceStart;
    let sliceEnd;

    // sliceStart -> where the selection starts
    // endSlice -> Where the selection ends

    // Only 1 block selected
    if (startKey === endKey) {
      sliceStart = startOffset;
      sliceEnd = endOffset;
      // Gets the selected characters of the block when multiple blocks are selected.
    } else {
      sliceStart = blockKey === startKey ? startOffset : 0;
      sliceEnd = blockKey === endKey ? endOffset : block.getLength();
    }

    // Get the characters of the current block
    let chars = block.getCharacterList();
    let current;
    while (sliceStart < sliceEnd) {
      current = chars.get(sliceStart);
      const newChar = callback(current, editorState);
      chars = chars.set(sliceStart, newChar);
      sliceStart += 1;
    }

    return block.set('characterList', chars);
  });

  const newContentState = contentState.merge({
    blockMap: blockMap.merge(newBlocks),
    selectionBefore: selectionState,
    selectionAfter: selectionState,
  });

  return EditorState.push(editorState, newContentState, 'apply-entity');
};

export const getEntityRangesOfType = type => (block, contentState) => {
  let ranges = [];
  const callback = (start, end) => ranges.push({ start, end });
  block.findEntityRanges(c => {
    const entityKey = c.getEntity();
    if (!entityKey) return false;
    return contentState.getEntity(entityKey).getType() === type;
  }, callback);

  return ranges;
};

export const sliceSelectedBlockCharacters = (block, selection) => {
  const startOffset = selection.getStartOffset();
  const endOffset = selection.getEndOffset();
  const startKey = selection.getStartKey();
  const endKey = selection.getEndKey();
  const blockKey = block.getKey();

  // Only 1 block selected
  if (blockKey === startKey && blockKey === endKey) {
    return {
      blockKey: block.getKey(),
      offset: { start: startOffset, end: endOffset },
      chars: block.getCharacterList().slice(startOffset, endOffset),
    };
  }

  // Multiple blocks selected, iterating first block
  if (blockKey === startKey) {
    return {
      blockKey: block.getKey(),
      offset: { start: startOffset, end: block.getLength() },
      chars: block.getCharacterList().slice(startOffset, block.getLength()),
    };
  }

  // Multiple blocks selected, iterating over last block
  if (blockKey === endOffset) {
    return {
      blockKey: block.getKey(),
      offset: { start: 0, end: endOffset },
      chars: block.getCharacterList().slice(0, endOffset),
    };
  }

  // Going over the middle block get all selected characters
  return {
    blockKey: block.getKey(),
    offset: { start: startOffset, end: endOffset },
    chars: block.getCharacterList().slice(startOffset, endOffset),
  };
};

export const getSelectedBlocks = editorState => {
  const contentState = editorState.getCurrentContent();
  const blockMap = contentState.getBlockMap();
  const startKey = editorState.getSelection().getStartKey();
  const endKey = editorState.getSelection().getEndKey();

  return blockMap.skipUntil((__, k) => k === startKey)
                 .takeUntil((__, k) => k === endKey)
                 .concat(Map([[endKey, blockMap.get(endKey)]]));
};

export const getSelectedBlocksAsList = editorState => {
  return getSelectedBlocks(editorState).toList();
};

const entityKeyHasType = (contentState, entityKey, entityType) => {
  if (!entityKey) return false;
  return contentState.getEntity(entityKey).getType() === entityType;
};

const entityKeyData = (contentState, entityKey) => {
  if (!entityKey) return null;
  return contentState.getEntity(entityKey).getData();
};

// TODO: [] test
export const findFirstEntityOfTypeInRange = (entityType, editorState) => {
  const contentState = editorState.getCurrentContent();
  const selection = editorState.getSelection();
  const selectedBlocks = getSelectedBlocksAsList(editorState);

  let found = {};
  selectedBlocks.some(block => {
    const { offset, blockKey } = sliceSelectedBlockCharacters(block, selection);
    let charOffset = offset.start - 1;
    while (charOffset++ < offset.end) {
      const entityKey = block.getEntityAt(charOffset);
      if (!entityKey || !entityKeyHasType(contentState, entityKey, entityType)) continue;
      const data = entityKeyData(contentState, entityKey);
      found = { blockKey, charOffset, data, entityKey };
      return true;
    }
  });

  return found;
};

// src
export const createEntity = (editorState, entity, data = {}) => {
  console.log('create');
  const mutability = entity.mutability;
  const type = entity.type;
  const entityData = data || entity.data;

  const selection = editorState.getSelection();
  const contentState = editorState.getCurrentContent();

  const contentStateWithEntity = contentState.createEntity(type, mutability, entityData);
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();

  if (!selection.isCollapsed()) {
    const newContentState = Modifier.applyEntity(contentStateWithEntity, selection, entityKey);
    return EditorState.push(editorState, newContentState, 'apply-entity');
  }

  // collapsed
  const offset = selection.getStartOffset();
  const startKey = selection.getStartKey();
  const blockLength = contentState.getBlockForKey(startKey).getLength();

  if (!blockLength || !(offset < blockLength)) return editorState;

  // we want to make a selection so we can apply
  const newContentState = Modifier.applyEntity(
    contentStateWithEntity,
    selection.merge({
      anchorOffset: offset,
      focusOffset: offset + 1,
    }),
    entityKey,
  );

  const newEditorState = EditorState.push(editorState, newContentState, 'apply-entity');

  // we want to make a selection back to what it originally was so we can apply
  return EditorState.forceSelection(newEditorState, newEditorState.getSelection().merge({
    focusOffset: offset,
  }));
};

export const mergeEntityData = (editorState, entityKey, newObj) => {
  console.log('merge');
  const contentState = editorState.getCurrentContent();
  const newContentState = contentState.mergeEntityData(entityKey, newObj);

  // Need to force the selection to see changes
  return EditorState.forceSelection(
    EditorState.push(editorState, newContentState, 'apply-entity'),
    editorState.getSelection()
  );
};

export const setEntityData = (editorState, entityKey, newObj) => {
  console.log('set');
  const contentState = editorState.getCurrentContent();
  const newContentState = contentState.replaceEntityData(entityKey, newObj);

  // Need to force the selection to see changes
  return EditorState.forceSelection(
    EditorState.push(editorState, newContentState, 'apply-entity'),
    editorState.getSelection()
  );
};

const removeCharEntityOfType = type => (char, editorState) => {
  const entityKey = char.getEntity();
  if (!entityKey) return char;

  if (editorState.getCurrentContent().getEntity(entityKey).getType() !== type) {
    return char;
  }

  return CharacterMetadata.applyEntity(char, null);
};

// TODO: [] More tests on this
export const removeEntity = (editorState, type) => {
  const selection = editorState.getSelection();
  if (!selection.isCollapsed()) {
    return mapSelectedCharacters(removeCharEntityOfType(type))(editorState);
  }

  const contentState = editorState.getCurrentContent();
  const offset = selection.getStartOffset();
  const startKey = selection.getStartKey();
  const blockLength = contentState.getBlockForKey(startKey).getLength();

  const newEditorState = EditorState.acceptSelection(
    editorState,
    editorState.getSelection().merge({
      anchorOffset: offset,
      focusOffset: offset + 1,
    }),
  );

  if (!blockLength || !(offset < blockLength)) return editorState;

  const newerEditorState = mapSelectedCharacters(removeCharEntityOfType(type))(newEditorState);

  // we want to make a selection back to what it originally was so we can apply
  return EditorState.forceSelection(newerEditorState, newerEditorState.getSelection().merge({
    focusOffset: offset,
  }));
};

export const entityManager = entityObj => editorState => {
  const { blockKey, charOffset, data, entityKey } = findFirstEntityOfTypeInRange(entityObj.type, editorState);
  const contentState = editorState.getCurrentContent();
  const sameType = entityKey && entityKeyHasType(contentState, entityKey, entityObj.type);
  const create =
    newData => createEntity(editorState, entityObj, { ...entityObj.data, ...newData });
  const merge = (newData = entityObj.data) => mergeEntityData(editorState, entityKey, newData);
  const set = (newData = entityObj.data) => setEntityData(editorState, entityKey, newData);
  const remove = () => removeEntity(editorState, entityObj.type);

  return {
    create,
    merge: sameType ? merge : create,
    set: sameType ? set : create,
    remove,
    exists: sameType,
    charOffset,
    data,
    entityKey,
    blockKey,
  };
};

// implementations
const linkEntityObj = {
  type: 'LINK',
  mutability: 'MUTABLE',
  data: {
    url: '',
    target: '',
  },
};

export const link = entityManager(linkEntityObj);

export const linkStrategy = (contentBlock, callback, contentState) => {
  contentBlock.findEntityRanges(
    character => {
      const entityKey = character.getEntity();
      if (!entityKey) return false;
      const entity = contentState.getEntity(entityKey);
      return entity.getType() === linkEntityObj.type;
    },
    callback,
  );
};

export const LinkEntityDecorator = ({ contentState, entityKey, children }) => {

  const entity = contentState.getEntity(entityKey);
  const data = entity.get('data');
  const url = data.url;
  const target = data.target;

  return (
    <a href={url} target={target}>
      {children}
    </a>
  );
};

LinkEntityDecorator.propTypes = {
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired,
  children: PropTypes.node,
};

// implementations
const colorEntityObj = {
  type: 'COLOR',
  mutability: 'MUTABLE',
  data: {
    color: '',
  },
};

export const color = entityManager(colorEntityObj);

export const colorStrategy = (contentBlock, callback, contentState) => {
  // console.log('strategy running');
  contentBlock.findEntityRanges(
    character => {
      const entityKey = character.getEntity();
      if (!entityKey) return false;
      const entity = contentState.getEntity(entityKey);
      return entity.getType() === colorEntityObj.type;
    },
    callback,
  );
};

export const ColorEntityDecorator = ({ contentState, entityKey, children }) => {
  const entity = contentState.getEntity(entityKey);
  const data = entity.get('data');

  return (
    <span style={{ color: data.color }}>
      {children}
    </span>
  );
};

ColorEntityDecorator.propTypes = {
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired,
  children: PropTypes.node,
};
