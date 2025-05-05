import {markdownToBlocks} from '../src';
import * as slack from '../src/slack';

describe('integration with unified', () => {
  it('should parse raw markdown into slack blocks', async () => {
    const text = `
a **b** _c_ **_d_ e**

# heading **a**

![59953191-480px](https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg)

<img src="https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg" alt="59953191-480px"/>

> block quote **a**
> block quote b

[link](https://apple.com)

- bullet _a_
- bullet _b_

1. number _a_
2. number _b_

- [ ] checkbox false
- [x] checkbox true

| Syntax      | Description | Test Col |
| ----------- | ----------- | -------- |
| Header      | Title       | Test 1   |
| Paragraph   | Text        | Test 2   |
`;

    const result = await markdownToBlocks(text);

    const expected = [
      slack.section('a *b* _c_ *_d_ e*'),
      slack.header('heading a'),
      slack.image(
        'https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg',
        '59953191-480px'
      ),
      slack.image(
        'https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg',
        '59953191-480px'
      ),
      slack.section('> block quote *a*\n> block quote b'),
      slack.section('<https://apple.com|link>'),
      slack.richText([
        slack.richTextList(
          [
            slack.richTextSection([
              {type: 'text', text: 'bullet '},
              {type: 'text', text: 'a', style: {italic: true}},
            ]),
            slack.richTextSection([
              {type: 'text', text: 'bullet '},
              {type: 'text', text: 'b', style: {italic: true}},
            ]),
          ],
          'bullet',
          0
        ),
      ]),
      slack.richText([
        slack.richTextList(
          [
            slack.richTextSection([
              {type: 'text', text: 'number '},
              {type: 'text', text: 'a', style: {italic: true}},
            ]),
            slack.richTextSection([
              {type: 'text', text: 'number '},
              {type: 'text', text: 'b', style: {italic: true}},
            ]),
          ],
          'ordered',
          0
        ),
      ]),
      slack.richText([
        slack.richTextList(
          [
            slack.richTextSection([{type: 'text', text: 'checkbox false'}]),
            slack.richTextSection([{type: 'text', text: 'checkbox true'}]),
          ],
          'bullet',
          0
        ),
      ]),
      slack.section(
        `\`\`\`
┌───────────┬─────────────┬──────────┐
│ Syntax    │ Description │ Test Col │
├───────────┼─────────────┼──────────┤
│ Header    │ Title       │ Test 1   │
│ Paragraph │ Text        │ Test 2   │
└───────────┴─────────────┴──────────┘
\`\`\``
      ),
    ].flat();

    expect(result.blocks).toStrictEqual(expected);
  });

  it('should parse long markdown', async () => {
    const text: string = new Array(3500).fill('a').join('') + 'bbbcccdddeee';
    const result = await markdownToBlocks(text);
    const expected = slack.section(text);
    expect(result.blocks).toStrictEqual(expected);
  });

  describe('code blocks', () => {
    it('should parse code blocks with no language', async () => {
      const text = `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``;

      const result = await markdownToBlocks(text);

      const expected = slack.section(
        `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``
      );

      expect(result.blocks).toStrictEqual(expected);
    });

    it('should parse code blocks with language', async () => {
      const text = `\`\`\`javascript
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``;

      const result = await markdownToBlocks(text);

      const expected = slack.section(
        `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``
      );

      expect(result.blocks).toStrictEqual(expected);
    });
  });

  it('should correctly escape text', async () => {
    const result = await markdownToBlocks('<>&\'""\'&><', {escapeSlack: true});
    const expected = slack.section('&lt;&gt;&amp;\'""\'&amp;&gt;&lt;');
    expect(result.blocks).toStrictEqual(expected);
  });
});
