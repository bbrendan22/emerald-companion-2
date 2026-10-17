// Western subset of the original parser's Gen III character table.
export function decodeText(data) {
  let result = '';
  const punctuation = {0:' ',0xab:'!',0xac:'?',0xad:'.',0xae:'-',0xb4:"'",0xb5:'♂',0xb6:'♀',0xb8:','};
  for (const code of data) {
    if (code === 255) break;
    if (code >= 0xbb && code <= 0xd4) result += String.fromCharCode(65 + code - 0xbb);
    else if (code >= 0xd5 && code <= 0xee) result += String.fromCharCode(97 + code - 0xd5);
    else if (code >= 0xa1 && code <= 0xaa) result += String(code - 0xa1);
    else result += punctuation[code] ?? '�';
  }
  return result;
}
