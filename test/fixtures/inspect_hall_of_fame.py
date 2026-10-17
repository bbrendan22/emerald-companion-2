"""One-time, independent HOF audit. No production-code or reference-data imports.

Reads the existing pinned fixture manifest, never rewrites it, and refuses to
replace the separate Stage 2 expectations. Outputs only sanitized counts.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys
from inspect_real_save import text


def inspect(raw, slot):
    payload = bytearray()
    for sector_id in (28, 29):
        sector = raw[sector_id * 4096:(sector_id + 1) * 4096]
        total = sum(struct.unpack('<992I', sector[:3968])) % 4294967296
        checksum = ((total // 65536) + (total % 65536)) % 65536
        if struct.unpack_from('<I', sector, 4088)[0] != 134291493 or struct.unpack_from('<H', sector, 4084)[0] != checksum:
            raise ValueError('Hall of Fame sector failed independent validation')
        payload.extend(sector[:3968])
    teams = []
    for index in range(50):
        if struct.unpack_from('<H', payload, index * 120 + 8)[0] % 512 == 0:
            break
        team = []
        for position in range(6):
            offset = index * 120 + position * 20
            ot, pid, packed = struct.unpack_from('<IIH', payload, offset)
            species, level = packed % 512, packed // 512
            if not species:
                continue
            if not 1 <= level <= 100 or not (1 <= species <= 251 or 277 <= species <= 412):
                raise ValueError('Unsupported HOF record in private fixture')
            team.append(dict(slot=position, internalSpeciesId=species, level=level, otId=ot, personality=pid,
                             nickname=text(payload[offset + 10:offset + 20]), isEgg=species == 412,
                             shiny=((ot % 65536) ^ (ot // 65536) ^ (pid % 65536) ^ (pid // 65536)) < 8))
        teams.append(team)
    sections = {}
    for physical in range(14):
        sector = raw[(slot * 14 + physical) * 4096:(slot * 14 + physical + 1) * 4096]
        sections[struct.unpack_from('<H', sector, 4084)[0]] = sector
    b1 = b''.join(sections[i][:3848 if i == 4 else 3968] for i in range(1, 5))
    return dict(isChampion=bool(b1[4988] & 16), retainedTeams=len(teams), teamIndex=0,
                team=teams[0] if teams else None)


if __name__ == '__main__':
    directory = Path(sys.argv[1])
    destination = directory / 'hall-of-fame.expected.private.json'
    if destination.exists():
        raise ValueError('Existing expectations must not be overwritten')
    original = json.loads((directory / 'expected.private.json').read_text())
    raw = (directory / original['fixtureFile']).read_bytes()
    if hashlib.sha256(raw).hexdigest() != original['sha256']:
        raise ValueError('Fixture differs from the original pinned manifest')
    expectation = inspect(raw, original['slotIndex'])
    destination.write_text(json.dumps(dict(sha256=original['sha256'], **expectation), indent=2) + '\n')
    destination.chmod(0o600)
    print(json.dumps(dict(isChampion=expectation['isChampion'], retainedTeams=expectation['retainedTeams'],
                          earliestTeamSize=len(expectation['team'] or []))))
