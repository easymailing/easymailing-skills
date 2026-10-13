import importlib.util
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'scripts/cdn-get.py';s=importlib.util.spec_from_file_location('cdn',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
path='/v2/cdn/stories/blog/test'
assert m.redirect_cache_version('https://api.storyblok.com'+path+'?token=fixture-secret&cv=123&version=published',path)=='123'
for value in ['https://evil.example'+path+'?cv=123','https://api.storyblok.com/else?cv=123','https://api.storyblok.com'+path+'?cv=bad','http://api.storyblok.com'+path+'?cv=123']:
 try:m.redirect_cache_version(value,path)
 except RuntimeError:pass
 else:raise AssertionError('Unsafe redirect accepted')
print('PROTECTED_CDN_REDIRECT_TEST_PASSED')
