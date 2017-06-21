import { EditorState, Modifier } from 'draft-js';
import { Map } from 'immutable';

// utils
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

// TODO: [] Test

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
    while (charOffset++ <= offset.end) {
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
export const createEntity = (editorState, entity, data) => {
  const mutability = entity.mutability;
  const type = entity.type;
  const entityData = data || entity.data;
  const contentStateWithEntity = editorState
    .getCurrentContent()
    .createEntity(type, mutability, entityData);
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();

  const newContentState = Modifier.applyEntity(
    contentStateWithEntity,
    editorState.getSelection(),
    entityKey,
  );

  return EditorState.push(editorState, newContentState, 'apply-entity');
};

export const mergeEntityData = (editorState, entityKey, newObj) => {
  const contentState = editorState.getCurrentContent();
  const newContentState = contentState.mergeEntityData(entityKey, newObj);

  return EditorState.push(editorState, newContentState, 'apply-entity');
};

export const setEntityData = (editorState, entityKey, newObj) => {
  const contentState = editorState.getCurrentContent();
  const newContentState = contentState.replaceEntityData(entityKey, newObj);

  return EditorState.push(editorState, newContentState, 'apply-entity');
};

// TODO: [] More tests on this
export const removeEntity = (editorState, entityType) => {
  const contentState = Modifier.applyEntity(
    editorState.getCurrentContent(),
    editorState.getSelection(),
    null,
  );

  return EditorState.push(editorState, contentState, 'apply-entity');
};

const linkEntityObj = {
  type: 'LINK',
  mutability: 'MUTABLE',
  data: {
    url: '',
    target: '',
  },
};

export const entity = entityObj => editorState => {
  const { blockKey, charOffset, data, entityKey } = findFirstEntityOfTypeInRange(entityObj.type, editorState);
  const create = newData => createEntity(editorState, entityObj, newData);
  const merge = newData => mergeEntityData(editorState, entityKey, newData);
  const set = newData => setEntityData(editorState, entityKey, newData);
  const remove = removeEntity(editorState, entityObj.type);

  return {
    create,
    merge: entityKey ? merge : create,
    set: entityKey ? set : create,
    remove,
    exists: entityKey,
    charOffset,
    data,
    entityKey,
    blockKey,
  };
};

const linkEntity = entity(linkEntityObj);
