const sources:Record<string,string>={gaia:'https://gaia.nullschool.net',atlas:'https://atlas.nullschool.net',terra1:'https://terra1.nullschool.net',pangaea:'https://pangaea.nullschool.net'};
export async function GET(request:Request){
  const local=new URL(request.url);
  const [, , host, ...path]=local.pathname.split('/');
  if(!Object.hasOwn(sources,host)||!path.length)return new Response('Not found',{status:404});
  const url=new URL('/'+path.join('/')+local.search,sources[host]);
  if(url.origin!==sources[host])return new Response('Invalid path',{status:400});
  try{
    // Fixed public sources only. No visitor cookies or Site authentication are forwarded.
    const response=await fetch(url.href,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    const headers=new Headers(response.headers);
    headers.delete('set-cookie');
    if(!response.ok)headers.set('Cache-Control','no-store');
    return new Response(response.body,{status:response.status,headers});
  }catch(error){return new Response('Source météo indisponible'+(import.meta.env.DEV?': '+String(error):''),{status:502,headers:{'Cache-Control':'no-store'}});}
}
