#!/usr/bin/env python3
import json, os, subprocess, sys, time
from urllib.parse import urlencode

def get(path):
    r = subprocess.run(['curl','-sf','--max-time','30','-H','Authorization: '+os.environ['STORYBLOK_MANAGEMENT_TOKEN'], 'https://mapi.storyblok.com/v1/spaces/310467/'+path], capture_output=True, text=True)
    if r.returncode: raise RuntimeError('Storyblok Management API no disponible')
    return json.loads(r.stdout)

try:
    slug=sys.argv[1].strip('/')
    if not slug or '?' in slug or '#' in slug or '..' in slug.split('/'):raise RuntimeError('Slug invalido')
    stories=get('stories?'+urlencode({'with_slug':slug,'per_page':100})).get('stories',[])
    story=next((s for s in stories if s.get('full_slug')==slug),None)
    if not story:raise RuntimeError('Story no encontrado')
    story=get('stories/'+str(story['id']))['story']
    preview=story.get('preview_token') or {}
    if not preview.get('token') or not preview.get('timestamp'):raise RuntimeError('Storyblok no devolvio firma temporal de preview')
    age=int(time.time())-int(preview['timestamp'])
    if age < 0 or age >= 3600:raise RuntimeError('Firma de preview caducada')
    query=urlencode({'_storyblok':story['id'],'_storyblok_tk[space_id]':310467,'_storyblok_tk[timestamp]':preview['timestamp'],'_storyblok_tk[token]':preview['token']})
    print('https://easymailing.com/'+story['full_slug']+'?'+query)
except Exception:
    print('Error: no se pudo generar el preview firmado de Storyblok; comprueba slug y secreto protegido del Gateway',file=sys.stderr)
    sys.exit(1)
