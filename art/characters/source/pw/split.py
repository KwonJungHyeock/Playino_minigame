import zipfile, os, sys
src_path, prefix = sys.argv[1], sys.argv[2]
src = zipfile.ZipFile(src_path); LIM = 28 * 2**20
groups = {}
for i in src.infolist():
    k = i.filename.split('/')[1]; groups.setdefault(k, []).append(i)
order = sorted(k for k in groups if k != '읽어보기.txt'); readme = groups.get('읽어보기.txt', [])
parts, cur, size = [], [], 0
for k in order:
    s = sum(i.compress_size for i in groups[k])
    if cur and size + s > LIM: parts.append(cur); cur, size = [], 0
    cur.append(k); size += s
if cur: parts.append(cur)
for n, ks in enumerate(parts, 1):
    fn = f'{prefix}_{n}of{len(parts)}_' + '_'.join(k.split('_', 1)[1] for k in ks) + '.zip'
    with zipfile.ZipFile(fn, 'w', zipfile.ZIP_DEFLATED) as z:
        for i in readme + [i for k in ks for i in groups[k]]: z.writestr(i, src.read(i.filename))
    print(fn, round(os.path.getsize(fn) / 2**20, 1), 'MB')
