import { describe, it, expect } from 'vitest';
import { Latin } from '../src/Exsurge.Text';

describe('Latin syllabification', () => {

  const lang = new Latin();

  function assertWordSyllables(word: string[], syllables: string[]) {
    expect(word.length).toBe(syllables.length);

    for (let i = 0; i < word.length; i++)
      expect(word[i]).toBe(syllables[i]);
  }

  it("Syllabify 'Puer natus est'", () => {

    const words = lang.syllabify('Puer natus est');
    expect(words.length).toBe(3);

    assertWordSyllables(words[0], ['Pu', 'er']);
    assertWordSyllables(words[1], ['na', 'tus']);
    assertWordSyllables(words[2], ['est']);
  });
});
