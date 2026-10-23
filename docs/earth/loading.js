// Report the completion of actual data downloads to the GIF studio.
// This contains no model data and is confined to this document.
(()=>{
  const original=window.fetch.bind(window),root=document.documentElement;let pending=0;
  root.dataset.weatherPending='0';
  window.fetch=async(...args)=>{
    const url=String(args[0]?.url||args[0]);
    if(!url.includes('/earth-data/')&&!/earth-topo\.json|map\/v2\//.test(url))return original(...args);
    pending++;root.dataset.weatherPending=String(pending);root.dataset.weatherError='';
    try{
      const response=await original(...args);
      if(!response.ok)root.dataset.weatherError='HTTP '+response.status+' · '+url;
      else{await response.clone().arrayBuffer();root.dataset.weatherLastSource=url;}
      return response;
    }catch(error){root.dataset.weatherError=String(error);throw error;}
    finally{pending--;root.dataset.weatherPending=String(pending);}
  };
})();
