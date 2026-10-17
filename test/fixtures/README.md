# Fixture provenance

No personal or real-game save is bundled. `synthetic.js` builds in-memory fixtures with a separate encoder: it imports no production decoder, checksum function, ordering table, layout constant or reference database. Its sector checksum uses BigInt arithmetic; the decoder uses uint32 arithmetic. Permutations are independently generated recursively in growth/attacks/EVs/misc order rather than copied from the decoder table. This provides isolation, but synthetic encoders can still share mistaken protocol assumptions; it cannot substitute for real saves.

`bulbasaur.hex` is a fixed 80-byte boxed record with PID=OTID=0, hence an all-zero encryption key and GAEM order. Its expected values are independently established from literal fields and arithmetic, not parser output:

- Growth words: species 1, item 13, experience 560, zero high experience word, `0x46c9` (friendship 70, PP Ups 1/2/0/3), zero padding. Sum 18,695.
- Attack words: 33, 0, 45, 0, 17, 25. Sum 120. This intentionally preserves empty move slots 1 and 3.
- EVs are zero; contest words `0x0201`, `0x0403`, `0x0605` sum to 3,081.
- Misc words: `0x0c21`, `0x2185`, `0xffff`, `0x3fff`, `0x8002`, 0. Sum 126,374.
- Total 148,270 modulo 65,536 = 17,198 = **0x432e**. The stored checksum is little-endian `2e43` at byte 28.
- Medium-slow experience at level 10 is `6*1000/5 - 15*100 + 100*10 - 140 = 560`; level 11 requires 742. Base stats are 45/49/49/45/65/65; all IVs 31, all EVs zero and neutral Hardy nature yield **32/17/17/17/21/21** at level 10. HP uses `floor((2*45+31)*10/100)+10+10=32`.
- Tackle's Gen III base PP 35 with one PP Up yields 42; Growl's base PP 40 with zero PP Ups stays 40. Empty slots retain their raw PP-Up bits.
- PID zero and OTID zero give shiny XOR zero; gender ratio 31 gives female; ability 65 is Overgrow. Origin `0x2185` encodes level 5, game 3 and ball 4; location 12, Pokérus `0x21`, ribbon word `0x8002`.

Additional explicit arithmetic: Deoxys at level 10 (slow experience 1,250), IV31/EV0/Hardy uses Emerald base stats 50/95/90/180/95/90, yielding 33/27/26/44/27/26. Adamant Bulbasaur Attack with IV31, EV7, level10 is `floor((floor((98+31+floor(7/4))*10/100)+5)*110/100)=19`; Special Attack is 18.

Sector fixture lengths are decimal literals for the retail structures (SaveBlock2 3,884; SaveBlock1 15,752; storage 33,744). Payload checksums cover only each section's actual data, never unused padding. Sources and scope are linked in the project README.

`hallOfFame.js` independently encodes compact Hall of Fame records and special-sector footers with BigInt checksums. `inspect_hall_of_fame.py` independently audits the private real fixture using Python stdlib and the existing independent text reader. It imports no production code/data and refuses to overwrite Stage 2 expectations.
