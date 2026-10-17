"""Independent, one-time stdlib reader for private regression expectations.
No production imports/data. Uses literal retail offsets, struct and itertools.
Usage: python3 inspect_real_save.py INPUT.sav OUTPUT.private.json
Not invoked by npm test. Never overwrite approved expectations automatically.
Protocol references: pret/pokeemerald include/{global,pokemon}.h and src/{save,pokemon}.c.
"""
import hashlib
import itertools
import json
from pathlib import Path
import struct
import sys


def u16(b, off=0):
    return struct.unpack_from('<H', b, off)[0]


def u32(b, off=0):
    return struct.unpack_from('<I', b, off)[0]


def text(b):
    chars = {0: ' ', 171: '!', 172: '?', 173: '.', 174: '-', 180: "'", 181: '♂', 182: '♀', 184: ','}
    chars.update({187+i: chr(65+i) for i in range(26)})
    chars.update({213+i: chr(97+i) for i in range(26)})
    chars.update({161+i: str(i) for i in range(10)})
    return ''.join(chars.get(c, '�') for c in b.split(b'\xff')[0])


KEYS = ['hp', 'attack', 'defense', 'speed', 'spAttack', 'spDefense']
ORDERS = list(itertools.permutations(range(4)))


def pokemon(b, source):
    if all(x == 0 for x in b) or all(x == 255 for x in b):
        return None
    pid, ot = struct.unpack_from('<II', b)
    plain = b''.join(struct.pack('<I', word ^ pid ^ ot) for (word,) in struct.iter_unpack('<I', b[32:80]))
    checksum = sum(struct.unpack('<24H', plain)) % 65536
    if checksum != u16(b, 28):
        raise ValueError(f'Invalid Pokémon checksum at {source}')
    chunks = [None]*4
    for pos, kind in enumerate(ORDERS[pid % 24]):
        chunks[kind] = plain[pos*12:pos*12+12]
    g, a, e, m = chunks
    species = u16(g)
    if species == 0:
        if b[19] & 6:
            raise ValueError(f'Flagged empty record at {source}')
        return None
    if b[19] & 1 or not b[19] & 2:
        raise ValueError(f'Invalid header flags at {source}')
    ivs = u32(m, 4)
    recorded = None
    if len(b) == 100:
        stats = dict(zip(KEYS, struct.unpack_from('<6H', b, 88)))
        recorded = dict(level=b[84], status=u32(b, 80), currentHp=u16(b, 86), stats=stats)
    return dict(source=source, internalSpeciesId=species, nickname=text(b[8:18]),
                experience=u32(g, 4), natureIndex=pid % 25, abilitySlot=ivs >> 31,
                heldItemId=u16(g, 2), ivs=dict(zip(KEYS, [(ivs >> (5*i)) & 31 for i in range(6)])),
                evs=dict(zip(KEYS, e[:6])),
                moves=[dict(id=u16(a, 2*i), currentPp=a[8+i], ppUps=(g[8] >> (2*i)) & 3) for i in range(4)],
                isEgg=bool(ivs & (1 << 30)), headerIsEgg=bool(b[19] & 4),
                origin=dict(gameId=(u16(m, 2) >> 7) & 15, metLevel=u16(m, 2) & 127,
                            metLocationId=m[1], ballId=(u16(m, 2) >> 11) & 15),
                pokerus=m[0], ribbonRaw=u32(m, 8), recorded=recorded)


def main():
    src, dest = map(Path, sys.argv[1:])
    if not dest.name.endswith('.private.json') or dest.exists():
        raise ValueError('Use a new .private.json output; existing expectations are never overwritten')
    raw = src.read_bytes()
    if len(raw) != 131072:
        raise ValueError('Not a 128 KiB raw save')
    lengths = [3884]+[3968]*3+[3848]+[3968]*8+[2000]
    slots, all_blocks, all_records, daycare_records, physical_orders = [], [], [], [], []
    for slot in range(2):
        sections, counters, errors, order = {}, set(), [], []
        for physical in range(14):
            b = raw[(slot*14+physical)*4096:(slot*14+physical+1)*4096]
            sid = u16(b, 4084)
            order.append(sid)
            if sid not in range(14):
                errors.append('id'); continue
            if sid in sections:
                errors.append('duplicate')
            data = b[:lengths[sid]]
            total = sum(struct.unpack('<'+'I'*(len(data)//4), data)) % 4294967296
            check = ((total // 65536)+(total % 65536)) % 65536
            if u16(b, 4086) != check or u32(b, 4088) != 0x08012025:
                errors.append('checksum/signature')
            sections[sid] = data
            counters.add(u32(b, 4092))
        if len(sections) != 14 or len(counters) != 1:
            errors.append('incomplete/mixed')
        slots.append(dict(index=slot, valid=not errors, counter=next(iter(counters)) if len(counters)==1 else None, errors=errors))
        physical_orders.append(order)
        if errors:
            raise ValueError(f'Fixture slot {slot} is invalid: {errors}')
        b2, b1, pc = sections[0], b''.join(sections[i] for i in range(1, 5)), b''.join(sections[i] for i in range(5, 14))
        all_blocks.append((b2, b1, pc))
        records = []
        count = u32(b1, 564)
        if count > 6:
            raise ValueError('Party overflow')
        for i in range(count):
            p = pokemon(b1[568+i*100:668+i*100], dict(kind='party', slot=i))
            if p is None:
                raise ValueError('Empty occupied party slot')
            records.append(p)
        for i in range(420):
            p = pokemon(pc[4+i*80:84+i*80], dict(kind='box', box=i//30, slot=i % 30))
            if p is not None:
                records.append(p)
        all_records.append(records)
        daycare_records.append([pokemon(b1[12336+i*140:12416+i*140], dict(kind='daycare', slot=i)) for i in range(2)])
    counts = [s['counter'] for s in slots]
    selected = 1 if counts[1] > counts[0] else 0
    if set(counts) == {4294967295, 0}:
        selected = counts.index(0)
    b2, b1, _ = all_blocks[selected]
    name, tid, sid = text(b2[:8]), u16(b2, 10), u16(b2, 12)
    identity = hashlib.sha256(f'{name}:{tid}:{sid}'.encode()).hexdigest()
    flags = lambda b, off: [bool(b[off+i//8] & (1 << (i % 8))) for i in range(386)]
    seen, caught, s1, s2 = flags(b2, 92), flags(b2, 40), flags(b1, 2440), flags(b1, 15140)
    badges = [bool(b1[4720+(2151+i)//8] & (1 << ((2151+i) % 8))) for i in range(8)]
    trainer = dict(identityDigest=identity, playtime=dict(hours=u16(b2, 14), minutes=b2[16], seconds=b2[17]),
                   money=u32(b1, 1168) ^ u32(b2, 172), badges=badges, badgeCount=sum(badges),
                   pokedex=dict(seen=seen, caught=caught, seenCount=sum(seen), caughtCount=sum(caught), total=386,
                                inconsistentSeenIds=[i+1 for i in range(386) if len({seen[i], s1[i], s2[i]}) != 1],
                                caughtWithoutSeenIds=[i+1 for i in range(386) if caught[i] and not seen[i]]))
    result = dict(provenance='Independent Python stdlib reader; raw fields, no 2.0 parser or reference-data imports; not in-game confirmation',
                  fixtureFile=src.name, sha256=hashlib.sha256(raw).hexdigest(), size=len(raw), slots=slots,
                  physicalOrders=physical_orders, slotIndex=selected, saveCounter=counts[selected], trainer=trainer,
                  records=all_records[selected], slotPokemonCounts=list(map(len, all_records)),
                  daycare=daycare_records[selected])
    dest.write_text(json.dumps(result, indent=2)+'\n')
    dest.chmod(0o600)
    print(json.dumps(dict(size=len(raw),slots=slots,selected=selected,playtime=trainer['playtime'],money=trainer['money'],
                         badges=trainer['badgeCount'],seen=sum(seen),caught=sum(caught),
                         mirrorDisagreements=len(trainer['pokedex']['inconsistentSeenIds']),
                         caughtWithoutSeen=len(trainer['pokedex']['caughtWithoutSeenIds']),
                         slotPokemonCounts=result['slotPokemonCounts'],daycareCount=sum(p is not None for p in result['daycare']))))


if __name__ == '__main__':
    main()
