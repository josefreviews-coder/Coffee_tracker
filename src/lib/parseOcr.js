// Simple OCR parsing heuristics for coffee labels.
// Returns an object with possible fields and confidence notes.

function toISODate(match){
  // Accept mm/dd/yyyy or mm-dd-yyyy or yyyy-mm-dd
  if(!match) return null
  const m = match.trim()
  // already ISO
  if(/^\d{4}-\d{2}-\d{2}$/.test(m)) return m
  // mm/dd/yyyy or mm/d/yy
  const parts = m.split(/[\/-]/).map(p=>p.trim())
  if(parts.length===3){
    // assume month/day/year if year length 4 or first part <=12
    let [a,b,c]=parts
    if(c.length===2) c = (parseInt(c,10)>50? '19':'20') + c
    let year = c.length===4? c : c
    let month = a.padStart(2,'0')
    let day = b.padStart(2,'0')
    return `${year}-${month}-${day}`
  }
  return null
}

export function parseOcrText(raw){
  if(!raw) return {}
  const text = raw.replace(/\r/g,'\n')
  const lines = text.split(/\n+/).map(l=>l.trim()).filter(Boolean)

  const result = {
    roastery: '',
    coffee_name: '',
    origin: '',
    elevation_value: '',
    elevation_unit: 'm',
    tasting_notes: '',
    roast_date: '',
    process: '',
    varietal: '',
    raw_lines: lines,
    confidence: {}
  }

  // Helper lowercase joined
  const joined = lines.join('\n')

  // Roast date: look for patterns like 'roast date: 8/24/2026' or 'roasted' nearby
  const roastDateRegex = /roast\s*date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i
  const roastMatch = joined.match(roastDateRegex)
  if(roastMatch){
    const iso = toISODate(roastMatch[1])
    if(iso){ result.roast_date = iso; result.confidence.roast_date = 'high' }
  } else {
    // try find any date-like token in lines
    for(const l of lines){
      const m = l.match(/([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/)
      if(m){ const iso = toISODate(m[1]); if(iso){ result.roast_date=iso; result.confidence.roast_date='medium'; break }}
    }
  }

  // Origin: look for line with country name or pattern like 'HONDURAS -'
  const originLine = lines.find(l => /\b(Afghanistan|Albania|Algeria|Andorra|Angola|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia|Botswana|Brazil|Brunei|Bulgaria|Burkina|Burundi|Cambodia|Cameroon|Canada|Chad|Chile|China|Colombia|Comoros|Congo|Costa Rica|Cote d'Ivoire|Croatia|Cuba|Cyprus|Czech|Denmark|Dominica|Dominican|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guyana|Haiti|Honduras|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Mauritania|Mauritius|Mexico|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Qatar|Romania|Russia|Rwanda|Saint Kitts|Saint Lucia|Samoa|San Marino|Sao Tome|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Togo|Tonga|Tunisia|Turkey|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe)\b/i)
  if(originLine){
    // take first word or up to hyphen
    const m = originLine.match(/([A-Z][A-Z\s]{2,})/) || [originLine]
    result.origin = originLine.split(/[-\\\/]/)[0].trim()
    result.confidence.origin = 'high'
  }

  // Elevation: look for MASL or 'm' ranges
  const elevRegex = /MASL[:\s]*([0-9]{3,4}(?:\s*[-–]\s*[0-9]{3,4})?)/i
  const elevMatch = joined.match(elevRegex)
  if(elevMatch){
    const val = elevMatch[1].replace(/\s+/g,'')
    result.elevation_value = val
    result.elevation_unit = 'm'
    result.confidence.elevation = 'high'
  } else {
    // fallback: find patterns like 1500-1700 m
    const alt = joined.match(/([0-9]{3,4})\s*[-–]\s*([0-9]{3,4})\s*m/i)
    if(alt){ result.elevation_value = `${alt[1]}-${alt[2]}`; result.elevation_unit='m'; result.confidence.elevation='medium' }
  }

  // Tasting notes: look for 'TASTE' or 'WE TASTE' or 'FLAVOR' lines
  const tasteLine = lines.find(l => /taste|flavor|we taste|we taste:/i.test(l))
  if(tasteLine){
    // get substring after colon
    const idx = tasteLine.indexOf(':')
    const notes = idx>=0 ? tasteLine.slice(idx+1).trim() : tasteLine
    // clean common OCR noise
    result.tasting_notes = notes.replace(/[=\*_~\\]/g,', ').replace(/\s{2,}/g,' ')
    result.confidence.tasting_notes = 'high'
  } else {
    // also try lines with many commas
    const commaline = lines.find(l => (l.match(/,/g)||[]).length>=2)
    if(commaline){ result.tasting_notes = commaline; result.confidence.tasting_notes='low' }
  }

  // Process: look for 'PROCESS: washed' or similar
  const processLine = lines.find(l => /process[:\s]/i.test(l))
  if(processLine){
    const idx = processLine.indexOf(':')
    result.process = idx>=0 ? processLine.slice(idx+1).trim() : processLine.trim()
    result.confidence.process = 'high'
  }

  // Varietal: look for 'VARIETAL:' or 'VARIETALS' or 'VARIETY'
  const varietalLine = lines.find(l => /variet|variety|varietal[:\s]/i.test(l))
  if(varietalLine){
    const idxv = varietalLine.indexOf(':')
    result.varietal = idxv>=0 ? varietalLine.slice(idxv+1).trim() : varietalLine.trim()
    result.confidence.varietal = 'high'
  }

  // Roastery: prefer top lines containing 'roaster' or 'coffees' or a company name
  const roasteryLine = lines.find(l => /roast(er|ers)|coffee (roaster|roasters)|coffees?|company|inc\.?/i.test(l))
  if(roasteryLine){ result.roastery = roasteryLine.replace(/[^\w\s&-\.]/g,'').trim(); result.confidence.roastery='high' }
  else if(lines.length>0){ result.roastery = lines[0]; result.confidence.roastery='low' }

  // Coffee name: often next non-empty line after roastery and not a metadata line
  let nameCandidate = ''
  if(result.roastery && lines.length>1){
    const idx = lines.indexOf(result.roastery)
    for(let i=idx+1;i<lines.length;i++){
      const l = lines[i]
      if(/roast|process|variet|masl|www|http|lot|we taste|taste|flavor|pack|bag/i.test(l)) continue
      nameCandidate = l; break
    }
  }
  if(nameCandidate) { result.coffee_name = nameCandidate; result.confidence.coffee_name='medium' }

  // Final cleanup: trim excessive punctuation
  ['roastery','coffee_name','origin','tasting_notes'].forEach(k=>{ if(result[k]) result[k]=result[k].replace(/^[^\w]+|[^\w]+$/g,'').trim() })

  return result
}
