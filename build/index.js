'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LinkEntityDecorator = exports.linkStrategy = exports.link = exports.entityManager = exports.removeEntity = exports.setEntityData = exports.mergeEntityData = exports.createEntity = exports.findFirstEntityOfTypeInRange = exports.getSelectedBlocksAsList = exports.getSelectedBlocks = exports.sliceSelectedBlockCharacters = exports.getEntityRangesOfType = undefined;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _draftJs = require('draft-js');

var _immutable = require('immutable');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// utils
var getEntityRangesOfType = exports.getEntityRangesOfType = function getEntityRangesOfType(type) {
  return function (block, contentState) {
    var ranges = [];
    var callback = function callback(start, end) {
      return ranges.push({ start: start, end: end });
    };
    block.findEntityRanges(function (c) {
      var entityKey = c.getEntity();
      if (!entityKey) return false;
      return contentState.getEntity(entityKey).getType() === type;
    }, callback);

    return ranges;
  };
};

var sliceSelectedBlockCharacters = exports.sliceSelectedBlockCharacters = function sliceSelectedBlockCharacters(block, selection) {
  var startOffset = selection.getStartOffset();
  var endOffset = selection.getEndOffset();
  var startKey = selection.getStartKey();
  var endKey = selection.getEndKey();
  var blockKey = block.getKey();

  // Only 1 block selected
  if (blockKey === startKey && blockKey === endKey) {
    return {
      blockKey: block.getKey(),
      offset: { start: startOffset, end: endOffset },
      chars: block.getCharacterList().slice(startOffset, endOffset)
    };
  }

  // Multiple blocks selected, iterating first block
  if (blockKey === startKey) {
    return {
      blockKey: block.getKey(),
      offset: { start: startOffset, end: block.getLength() },
      chars: block.getCharacterList().slice(startOffset, block.getLength())
    };
  }

  // Multiple blocks selected, iterating over last block
  if (blockKey === endOffset) {
    return {
      blockKey: block.getKey(),
      offset: { start: 0, end: endOffset },
      chars: block.getCharacterList().slice(0, endOffset)
    };
  }

  // Going over the middle block get all selected characters
  return {
    blockKey: block.getKey(),
    offset: { start: startOffset, end: endOffset },
    chars: block.getCharacterList().slice(startOffset, endOffset)
  };
};

var getSelectedBlocks = exports.getSelectedBlocks = function getSelectedBlocks(editorState) {
  var contentState = editorState.getCurrentContent();
  var blockMap = contentState.getBlockMap();
  var startKey = editorState.getSelection().getStartKey();
  var endKey = editorState.getSelection().getEndKey();

  return blockMap.skipUntil(function (__, k) {
    return k === startKey;
  }).takeUntil(function (__, k) {
    return k === endKey;
  }).concat((0, _immutable.Map)([[endKey, blockMap.get(endKey)]]));
};

var getSelectedBlocksAsList = exports.getSelectedBlocksAsList = function getSelectedBlocksAsList(editorState) {
  return getSelectedBlocks(editorState).toList();
};

var entityKeyHasType = function entityKeyHasType(contentState, entityKey, entityType) {
  if (!entityKey) return false;
  return contentState.getEntity(entityKey).getType() === entityType;
};

var entityKeyData = function entityKeyData(contentState, entityKey) {
  if (!entityKey) return null;
  return contentState.getEntity(entityKey).getData();
};

// TODO: [] test
var findFirstEntityOfTypeInRange = exports.findFirstEntityOfTypeInRange = function findFirstEntityOfTypeInRange(entityType, editorState) {
  var contentState = editorState.getCurrentContent();
  var selection = editorState.getSelection();
  var selectedBlocks = getSelectedBlocksAsList(editorState);

  var found = {};
  selectedBlocks.some(function (block) {
    var _sliceSelectedBlockCh = sliceSelectedBlockCharacters(block, selection),
        offset = _sliceSelectedBlockCh.offset,
        blockKey = _sliceSelectedBlockCh.blockKey;

    var charOffset = offset.start - 1;
    while (charOffset++ <= offset.end) {
      var entityKey = block.getEntityAt(charOffset);
      if (!entityKey || !entityKeyHasType(contentState, entityKey, entityType)) continue;
      var data = entityKeyData(contentState, entityKey);
      found = { blockKey: blockKey, charOffset: charOffset, data: data, entityKey: entityKey };
      return true;
    }
  });

  return found;
};

// src
var createEntity = exports.createEntity = function createEntity(editorState, entity, data) {
  var mutability = entity.mutability;
  var type = entity.type;
  var entityData = data || entity.data;
  var contentStateWithEntity = editorState.getCurrentContent().createEntity(type, mutability, entityData);
  var entityKey = contentStateWithEntity.getLastCreatedEntityKey();

  var newContentState = _draftJs.Modifier.applyEntity(contentStateWithEntity, editorState.getSelection(), entityKey);

  return _draftJs.EditorState.push(editorState, newContentState, 'apply-entity');
};

var mergeEntityData = exports.mergeEntityData = function mergeEntityData(editorState, entityKey, newObj) {
  var contentState = editorState.getCurrentContent();
  var newContentState = contentState.mergeEntityData(entityKey, newObj);

  return _draftJs.EditorState.push(editorState, newContentState, 'apply-entity');
};

var setEntityData = exports.setEntityData = function setEntityData(editorState, entityKey, newObj) {
  var contentState = editorState.getCurrentContent();
  var newContentState = contentState.replaceEntityData(entityKey, newObj);

  return _draftJs.EditorState.push(editorState, newContentState, 'apply-entity');
};

// TODO: [] More tests on this
var removeEntity = exports.removeEntity = function removeEntity(editorState, entityType) {
  var contentState = _draftJs.Modifier.applyEntity(editorState.getCurrentContent(), editorState.getSelection(), null);

  return _draftJs.EditorState.push(editorState, contentState, 'apply-entity');
};

var entityManager = exports.entityManager = function entityManager(entityObj) {
  return function (editorState) {
    var _findFirstEntityOfTyp = findFirstEntityOfTypeInRange(entityObj.type, editorState),
        blockKey = _findFirstEntityOfTyp.blockKey,
        charOffset = _findFirstEntityOfTyp.charOffset,
        data = _findFirstEntityOfTyp.data,
        entityKey = _findFirstEntityOfTyp.entityKey;

    var create = function create(newData) {
      return createEntity(editorState, entityObj, newData);
    };
    var merge = function merge(newData) {
      return mergeEntityData(editorState, entityKey, newData);
    };
    var set = function set(newData) {
      return setEntityData(editorState, entityKey, newData);
    };
    var remove = removeEntity(editorState, entityObj.type);

    return {
      create: create,
      merge: entityKey ? merge : create,
      set: entityKey ? set : create,
      remove: remove,
      exists: entityKey,
      charOffset: charOffset,
      data: data,
      entityKey: entityKey,
      blockKey: blockKey
    };
  };
};

// implementations
var linkEntityObj = {
  type: 'LINK',
  mutability: 'MUTABLE',
  data: {
    url: '',
    target: ''
  }
};

var link = exports.link = entityManager(linkEntityObj);

var linkStrategy = exports.linkStrategy = function linkStrategy(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(function (character) {
    var entityKey = character.getEntity();
    if (!entityKey) return false;
    var entity = contentState.getEntity(entityKey);
    return entity.getType() === linkEntityObj.type;
  }, callback);
};

var LinkEntityDecorator = exports.LinkEntityDecorator = function LinkEntityDecorator(_ref) {
  var contentState = _ref.contentState,
      entityKey = _ref.entityKey,
      children = _ref.children;

  var entity = contentState.getEntity(entityKey);
  var data = entity.get('data');
  var url = data.url;
  var target = data.target;

  return _react2.default.createElement(
    'a',
    { href: url, target: target },
    children
  );
};

LinkEntityDecorator.propTypes = {
  contentState: _propTypes2.default.object.isRequired,
  entityKey: _propTypes2.default.string.isRequired,
  children: _propTypes2.default.node
};