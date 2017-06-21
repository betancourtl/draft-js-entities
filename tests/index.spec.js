import { expect } from 'chai';
import RawContentState from 'draft-js-raw-content-state';
import {
  createEntity,
  mergeEntityData,
  setEntityData,
  removeEntity,
  getEntityRangesOfType,
  findFirstEntityOfTypeInRange,
  entityManager,
} from '../src';

// types
const entityType = {
  link: 'LINK',
};

// mutability
const mutability = {
  mutable: 'MUTABLE',
  immutable: 'IMMUTABLE',
  segmented: 'SEGMENTED',
};

const linkEntity = {
  type: entityType.link,
  mutability: mutability.mutable,
  data: {
    href: '',
    target: '',
  },
};

const findLinkEntityRanges = getEntityRangesOfType(entityType.link);
const linkEntityManger = entityManager(linkEntity);

describe('draft-js-entities', () => {
  describe('getEntityRangesOfType', () => {
    it('should find entity ranges', () => {
      const data = { href: 'hello-world.com', target: '_blank' };
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(17)
        .focusKey(21)
        .toEditorState();

      const newEditorState = createEntity(editorState, linkEntity, data);
      const contentState = newEditorState.getCurrentContent();
      const firstBlock = contentState.getFirstBlock();
      const ranges = findLinkEntityRanges(firstBlock, contentState);
      expect(ranges).to.deep.equal([{ start: 17, end: 21 }]);
    });
  });

  describe('createEntity', () => {
    it('should create an entity', () => {
      const data = { href: 'hello-world.com', target: '_blank' };
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(17)
        .focusKey(21)
        .toEditorState();

      const newEditorState = createEntity(editorState, linkEntity, data);
      const contentState = newEditorState.getCurrentContent();
      const firstBlock = contentState.getFirstBlock();
      const ranges = findLinkEntityRanges(firstBlock, contentState);
      expect(ranges).to.deep.equal([{ start: 17, end: 21 }]);
    });
  });

  describe('removeEntityData', () => {
    it('should remove entityData', () => {
      const data = { href: 'hello-world.com', target: '_blank' };
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(17)
        .focusKey(21)
        .addEntity(linkEntity, 17, 21)
        .addBlock('text with entity here')
        .toEditorState();

      const newEditorState = removeEntity(editorState, linkEntity, data);
      const contentState = newEditorState.getCurrentContent();
      const firstBlock = contentState.getFirstBlock();
      const ranges = findLinkEntityRanges(firstBlock, contentState);
      expect(ranges).to.deep.equal([]);
    });
  });

  describe('setEntityData', () => {
    it('should set entityData', () => {
      const data = { href: 'new-data', target: '_blank', other: 'Hello' };
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(17)
        .focusKey(21)
        .addEntity(linkEntity, 17, 21)
        .addBlock('text with entity here')
        .toEditorState();

      const entityKey = editorState.getCurrentContent().getFirstBlock().getEntityAt(17);
      const newEditorState = setEntityData(editorState, entityKey, data);
      const updatedEntityKey = newEditorState.getCurrentContent().getFirstBlock().getEntityAt(17);
      const entityData = newEditorState.getCurrentContent().getEntity(updatedEntityKey).getData();
      expect(entityData).to.deep.equal(data);
    });
  });

  describe('mergeEntityData', () => {
    it('should set entityData', () => {
      const data = { href: 'google.com' };
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(17)
        .focusKey(21)
        .addEntity(linkEntity, 17, 21)
        .addBlock('text with entity here')
        .toEditorState();

      const entityKey = editorState.getCurrentContent().getFirstBlock().getEntityAt(17);
      const newEditorState = mergeEntityData(editorState, entityKey, data);
      const updatedEntityKey = newEditorState.getCurrentContent().getFirstBlock().getEntityAt(17);
      const entityData = newEditorState.getCurrentContent().getEntity(updatedEntityKey).getData();
      expect(entityData).to.deep.equal({ ...linkEntity.data, ...data });
    });
  });

  describe('findFirstEntityOfTypeInRange', () => {
    it('should find ranges on a non-collapsed selection', () => {
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(17)
        .focusKey(21)
        .addEntity(linkEntity, 17, 21)
        .addBlock('text with entity here')
        .toEditorState();
      const result = findFirstEntityOfTypeInRange(linkEntity.type, editorState);
      expect(result.charOffset).to.deep.equal(17);
    });
    it('should find ranges on a non-collapsed selection with multiple blocks', () => {
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .anchorKey(0)
        .addBlock('text with entity right here')
        //         -----------------------^--^ 23-27
        .addEntity(linkEntity, 17, 21)
        .focusKey(23)
        .toEditorState();
      const result = findFirstEntityOfTypeInRange(linkEntity.type, editorState);
      expect(result.charOffset).to.deep.equal(17);
    });
    it('should find ranges on a collapsed selection', () => {
      const editorState = new RawContentState()
        .addBlock('text with entity here')
        //         -----------------^--^ 17-21
        .collapse(18)
        .addEntity(linkEntity, 17, 21)
        .addBlock('text with entity here')
        .toEditorState();
      const result = findFirstEntityOfTypeInRange(linkEntity.type, editorState);
      expect(result.charOffset).to.deep.equal(18);
    });
  });

  describe('entity', () => {
    describe('entity.create', () => {
      it('should create a new entity', () => {
        const data = { url: 'google.com' };
        const editorState = new RawContentState()
          .addBlock('text with entity here')
          //         -----------------^--^ 17-21
          .anchorKey(0)
          .focusKey(21)
          .toEditorState();
        const link = linkEntityManger(editorState);
        const newEditorState = link.create(data);
        const contentState = newEditorState.getCurrentContent();
        const firstBlock = contentState.getFirstBlock();
        const ranges = findLinkEntityRanges(firstBlock, contentState);
        expect(ranges).to.deep.equal([{ start: 0, end: 21 }]);
      });
    });
    describe('entity.merge', () => {
      it('should "merge" entity data when entity does not exist', () => {
        const data = { url: 'google.com' };
        const editorState = new RawContentState()
          .addBlock('text with entity here')
          //         -----------------^--^ 17-21
          .anchorKey(0)
          .focusKey(21)
          .toEditorState();
        const link = linkEntityManger(editorState);
        const newEditorState = link.merge(data);
        const contentState = newEditorState.getCurrentContent();
        const firstBlock = contentState.getFirstBlock();
        const ranges = findLinkEntityRanges(firstBlock, contentState);
        expect(ranges).to.deep.equal([{ start: 0, end: 21 }]);
        expect(contentState.getEntity(firstBlock.getEntityAt(0)).getData().url).to.equal(data.url);
      });
      it('should "merge" entity data when entity already exist', () => {
        const data = { url: 'new data!!.com' };
        const editorState = new RawContentState()
          .addBlock('text with entity here')
          //         -----------------^--^ 17-21
          .collapse(20)
          .addEntity(linkEntity, 17, 21)
          .toEditorState();
        const link = linkEntityManger(editorState);
        const newEditorState = link.merge(data);
        const contentState = newEditorState.getCurrentContent();
        const firstBlock = contentState.getFirstBlock();
        expect(contentState.getEntity(firstBlock.getEntityAt(17)).getData().url).to.equal(data.url);
      });
    });
    describe('entity.set', () => {
      it('should "set" entity data when entity does not exist', () => {
        const data = { url: 'test.com' };
        const editorState = new RawContentState()
          .addBlock('text with entity here')
          //         -----------------^--^ 17-21
          .anchorKey(0)
          .focusKey(21)
          .addEntity(linkEntity, 17, 21)
          .toEditorState();
        const link = linkEntityManger(editorState);
        const newEditorState = link.set(data);
        const contentState = newEditorState.getCurrentContent();
        const firstBlock = contentState.getFirstBlock();
        expect(contentState.getEntity(firstBlock.getEntityAt(20)).getData()).to.equal(data);
      });
    });
    describe('entity.remove', () => {

    });
  });
});
