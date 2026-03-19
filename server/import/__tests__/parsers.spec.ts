import { parseImportFile } from '../parsers';

describe('import parsers', () => {
  it('parses csv file into rows with rowNumber', async () => {
    const csv = Buffer.from('term,meaning,tags\nApple,Fruit,food\nDog,Animal,pet');

    const rows = await parseImportFile('sample.csv', csv);

    expect(rows).toEqual([
      { term: 'Apple', meaning: 'Fruit', tags: 'food', rowNumber: 2 },
      { term: 'Dog', meaning: 'Animal', tags: 'pet', rowNumber: 3 },
    ]);
  });

  it('rejects unsupported extension', async () => {
    await expect(
      parseImportFile('sample.txt', Buffer.from('term,meaning'))
    ).rejects.toThrow('Unsupported file format');
  });
});
