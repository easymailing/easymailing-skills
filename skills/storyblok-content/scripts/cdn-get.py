#!/usr/bin/env python3
"""Read Storyblok CDN with opaque Gateway auth. Never follow a reflected token URL."""
import json,os,re,subprocess,sys,tempfile
from urllib.parse import urlencode,urlsplit,urljoin

def redirect_cache_version(location, expected_path):
    from urllib.parse import parse_qs
    p=urlsplit(urljoin('https://api.storyblok.com',location))
    if p.scheme!='https' or p.hostname!='api.storyblok.com' or p.port or p.username or p.password or p.path!=expected_path:
        raise RuntimeError('Unexpected CDN redirect destination')
    values=parse_qs(p.query).get('cv',[])
    if len(values)!=1 or not re.fullmatch(r'[0-9]{1,20}',values[0]):raise RuntimeError('Invalid CDN cache version')
    # Discard every other redirect parameter, especially the reflected plaintext token.
    return values[0]

def fetch(slug,version):
    path='/v2/cdn/stories/'+slug
    cv=None
    for _ in range(3):
        query={'version':version,'token':os.environ['STORYBLOK_CDN_TOKEN']}
        if cv is not None:query['cv']=cv
        url='https://api.storyblok.com'+path+'?'+urlencode(query)
        with tempfile.TemporaryFile(mode='w+') as body:
            r=subprocess.run(['curl','-sS','--max-time','30','-D','-','-o','/dev/fd/'+str(body.fileno()),url],pass_fds=(body.fileno(),),capture_output=True,text=True)
            if r.returncode:raise RuntimeError('CDN transport failed')
            statuses=re.findall(r'^HTTP/\S+\s+(\d+)',r.stdout,re.M)
            status=int(statuses[-1]) if statuses else 0
            if status==200:
                body.seek(0);return json.load(body)
            if status not in [301,302,307,308]:raise RuntimeError('CDN response refused')
            locations=[line.split(':',1)[1].strip() for line in r.stdout.splitlines() if line.lower().startswith('location:')]
            if len(locations)!=1:raise RuntimeError('CDN redirect missing')
            cv=redirect_cache_version(locations[0],path)
    raise RuntimeError('CDN cache changed repeatedly')

if __name__=='__main__':
    try:
        slug=sys.argv[1].strip('/')
        if not slug or '?' in slug or '#' in slug or '..' in slug.split('/'):raise RuntimeError('Invalid slug')
        version='draft' if '--draft' in sys.argv[2:] else 'published'
        print(json.dumps(fetch(slug,version),indent=2,ensure_ascii=False))
    except Exception:
        print('Error: no se pudo consultar Storyblok CDN de forma protegida',file=sys.stderr);sys.exit(1)
