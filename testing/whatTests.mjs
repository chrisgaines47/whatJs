import { describe, it, expect } from './testSuite.mjs';
import model from './what.mjs';

describe('model', () => {
    it('sets data', () => {
        model.a = {ok: 'go'};
        expect(model.a.ok).toBe('go');
    });

    it('a test that will never run', () => {
        expect(1).toBe(1);
    });
});

describe('another suite', () => {
    it('should succeed, true === true', () => {
        expect(true).toBe(true);
    });

    it('should succeed, 1 === 1', () => {
        expect(1).toBe(1);
    });
});