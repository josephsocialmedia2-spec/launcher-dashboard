const { test, expect } = require('@playwright/test');

const INSIDE=['Susa','Mompantero','Meana di Susa','Gravere','Giaglione','Venaus','Mattie','Chiomonte','Novalesa','Bussoleno','Chianocco','Moncenisio','San Giorio di Susa'];
const OUTSIDE=['Usseaux','Exilles','Bruzolo','Fenestrelle'];

async function mockSources(page){
  const csv=[
    'COMUNE,DOVE_ANDRE,COSA_CERCO,PREZZO,SELLER_SIGNAL,SCORE,PRIORITA,FONTE,URL',
    'San Giorio di Susa,Via Roma 1,Appartamento,100000,INDIZIO_PRIVATO,70,ALTA,QA,https://example.com/in-9-8',
    'Usseaux,Via Roma 2,Appartamento,90000,INDIZIO_PRIVATO,99,MASSIMA,QA,https://example.com/out-10-1',
    'Exilles,Via Roma 3,Appartamento,80000,INDIZIO_PRIVATO,98,MASSIMA,QA,https://example.com/out-10-8',
    'Chianocco,Via Roma 4,Appartamento,70000,NON_DETERMINATO,30,BASSA,QA,https://example.com/in-9-1'
  ].join('\n');
  await page.route('https://josephsocialmedia2-spec.github.io/immobili-in-zona/**',route=>route.fulfill({status:200,contentType:'text/csv',body:csv}));
  await page.route('**/seller-segnalati.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[
    {id:'manual-susa',comune:'Susa',indirizzo:'Via Test 1',seller_signal:['PRIVATO'],score:50},
    {id:'manual-bruzolo',comune:'Bruzolo',indirizzo:'Via Test 2',seller_signal:['PRIVATO'],score:100}
  ]})}));
}

test('Filtro Susa 10 km: include il bordo valido ed esclude comuni oltre 10 km',async({page})=>{
  await mockSources(page);
  await page.goto('/acquisitore-pro-mobile/index.html?radiusqa='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.F1Susa10kmFilter&&!!window.F1SellerSignalsZone);
  expect(await page.evaluate(()=>window.F1Susa10kmFilter.MAX_KM)).toBe(10);
  expect(await page.evaluate(()=>window.F1Susa10kmFilter.isAllowedComune('San Giorio di Susa'))).toBeTruthy();
  expect(await page.evaluate(()=>window.F1Susa10kmFilter.isAllowedComune('Usseaux'))).toBeFalsy();
  expect(await page.evaluate(()=>window.F1Susa10kmFilter.isAllowedComune('Exilles'))).toBeFalsy();

  await page.locator('#zoneOpenBtn').click();
  await page.waitForFunction(()=>window.F1SellerSignalsZone.getRecords().length>0);
  const active=await page.evaluate(()=>window.F1SellerSignalsZone.getActive().map(x=>x.comune));
  expect(active).toContain('San Giorio di Susa');
  expect(active).toContain('Chianocco');
  expect(active).toContain('Susa');
  for(const comune of OUTSIDE)expect(active).not.toContain(comune);

  const targets=await page.evaluate(()=>JSON.parse(localStorage.getItem('f1VaiZonaTargets')||'[]').map(x=>x.paese));
  for(const comune of OUTSIDE)expect(targets).not.toContain(comune);
});

test('Haversine: il punto zero è Susa e il confine 10 km è matematico',async({page})=>{
  await mockSources(page);
  await page.goto('/acquisitore-pro-mobile/index.html?haversineq='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.F1Susa10kmFilter);
  const result=await page.evaluate(()=>{
    const f=window.F1Susa10kmFilter,R=f.EARTH_RADIUS_KM,c=f.CENTER;
    const point=(km)=>({lat:c.lat+(km/R)*(180/Math.PI),lon:c.lon});
    const p9999=point(9.999),p10001=point(10.001);
    return {
      center:c,
      d0:f.haversineKm(c,c),
      d9999:f.haversineKm(c,p9999),
      d10001:f.haversineKm(c,p10001),
      in9999:f.isAllowedCoords(p9999.lat,p9999.lon),
      out10001:f.isAllowedCoords(p10001.lat,p10001.lon)
    };
  });
  expect(result.center).toEqual({lat:45.138352,lon:7.050245});
  expect(result.d0).toBeLessThan(0.000001);
  expect(result.d9999).toBeCloseTo(9.999,3);
  expect(result.d10001).toBeCloseTo(10.001,3);
  expect(result.in9999).toBeTruthy();
  expect(result.out10001).toBeFalsy();
});

test('Coordinate reali hanno precedenza sul nome del Comune',async({page})=>{
  await mockSources(page);
  await page.goto('/acquisitore-pro-mobile/index.html?coordqa='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.F1Susa10kmFilter);
  const result=await page.evaluate(()=>{
    const f=window.F1Susa10kmFilter,R=f.EARTH_RADIUS_KM,c=f.CENTER;
    const atKm=km=>({lat:c.lat+(km/R)*(180/Math.PI),lon:c.lon});
    const inside=atKm(5),outside=atKm(10.5);
    const rows=[
      {id:'wrong-name-out',comune:'Susa',lat:outside.lat,lon:outside.lon},
      {id:'wrong-name-in',comune:'Comune inventato',lat:inside.lat,lon:inside.lon},
      {id:'unknown-no-coords',comune:'Comune inventato'}
    ];
    return f.filterRecords(rows).map(x=>x.id);
  });
  expect(result).toEqual(['wrong-name-in']);
});

test('Filtro Susa 10 km: pulisce anche cache e destinazioni legacy fuori raggio',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('f1SellerSignalCacheV3',JSON.stringify({records:[
      {id:'s1',comune:'Susa',indirizzo:'Via A 1'},
      {id:'u1',comune:'Usseaux',indirizzo:'Via B 2'},
      {id:'e1',comune:'Exilles',indirizzo:'Via C 3'}
    ]}));
    localStorage.setItem('f1VaiZonaTargets',JSON.stringify([
      {paese:'Susa',via:'Via A',civico:'1'},
      {paese:'Usseaux',via:'Via B',civico:'2'}
    ]));
  });
  await mockSources(page);
  await page.goto('/acquisitore-pro-mobile/index.html?radiuscacheqa='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.F1Susa10kmFilter);
  const cache=await page.evaluate(()=>JSON.parse(localStorage.getItem('f1SellerSignalCacheV3')||'{}').records.map(x=>x.comune));
  expect(cache).toEqual(['Susa']);
  const targets=await page.evaluate(()=>JSON.parse(localStorage.getItem('f1VaiZonaTargets')||'[]').map(x=>x.paese));
  expect(targets).toEqual(['Susa']);
});

test('Perimetro canonico: nessun comune non verificato viene ammesso senza coordinate',async({page})=>{
  await mockSources(page);
  await page.goto('/acquisitore-pro-mobile/index.html?radiuslistqa='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.F1Susa10kmFilter);
  const checks=await page.evaluate(names=>Object.fromEntries(names.map(n=>[n,window.F1Susa10kmFilter.isAllowedComune(n)])),[...INSIDE,...OUTSIDE,'Comune inventato']);
  for(const comune of INSIDE)expect(checks[comune],comune).toBeTruthy();
  for(const comune of [...OUTSIDE,'Comune inventato'])expect(checks[comune],comune).toBeFalsy();
});
