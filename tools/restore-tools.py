import concurrent.futures, urllib.request, pathlib, zipfile
base=pathlib.Path(__file__).resolve().parent/'build-tools'
base.mkdir(parents=True,exist_ok=True)
urls={
 'ecj.jar':'https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.39.0/ecj-3.39.0.jar',
 'aapt2.jar':'https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/8.6.1-11315950/aapt2-8.6.1-11315950-linux.jar',
 'apksig.jar':'https://dl.google.com/dl/android/maven2/com/android/tools/build/apksig/8.6.1/apksig-8.6.1.jar',
 'r8.jar':'https://storage.googleapis.com/r8-releases/raw/8.6.27/r8.jar',
 'platform.zip':'https://dl.google.com/android/repository/platform-35_r02.zip'}
def fetch(item):
 name,url=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'HellOS-build'})
  with urllib.request.urlopen(req,timeout=45) as source,open(base/name,'wb') as out:
   while chunk:=source.read(1024*1024):out.write(chunk)
  print(name,(base/name).stat().st_size,flush=True)
 except Exception as error:print(name,str(error),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(fetch,urls.items()))
for file in ['platform.zip','aapt2.jar']:
 try:
  with zipfile.ZipFile(base/file) as z:
   if file=='aapt2.jar':
    z.extract('aapt2',base);(base/'aapt2').chmod(0o755)
   else:
    name=next(name for name in z.namelist() if name.endswith('/android.jar'))
    target=base/'android-35';target.mkdir(exist_ok=True)
    (target/'android.jar').write_bytes(z.read(name))
 except Exception as error:print(file,str(error),flush=True)
