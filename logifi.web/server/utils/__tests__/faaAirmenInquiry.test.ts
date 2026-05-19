import { describe, expect, it } from 'vitest'
import { extractCandidates, parseAirmenDetailHtml } from '../faaAirmenInquiry'

const SAMPLE_DETAIL_HTML = `
<span id="ctl00_content_ctl01_ctl00_lbName" class="Cert_Name"><b>CHARLES ELWOOD YEAGER </b></span>
<span class="Cert_Info" style="color:red">Airman opted-out of releasing address</span>
<span class="Cert_Info"><b>Medical Class:</b>&nbsp;Third&nbsp;&nbsp;<b>Medical Date:</b>&nbsp;6/2014</span>
<span id="CertHeader0">COMMERCIAL PILOT</span>
<div id="TabBody0" style="display:block"><label class="Cert_Info"><b>Certificate:</b>&nbsp;COMMERCIAL PILOT&nbsp;&nbsp;<br/><b>Date of Issue:</b>&nbsp;7/30/2003</label><br/><br/><label class="Cert_Info"><b>Ratings:</b> <br/><u>COMMERCIAL PILOT</u><br/>&nbsp;&nbsp;AIRPLANE SINGLE ENGINE LAND<br/>&nbsp;&nbsp;AIRPLANE SINGLE ENGINE SEA<br/>&nbsp;&nbsp;INSTRUMENT AIRPLANE<br/><label class="Cert_Info"><br/><b>Type Ratings:</b><table><tr valign='top'><td align='left' valign='top' cssclass='small'>C/L-18</td></tr></table></label></label></div>
<div id="TabBody1" style="display:none"></div>
`

const SAMPLE_WITH_INSTRUCTOR_HTML = `
<span id="ctl00_content_ctl01_ctl00_lbName" class="Cert_Name"><b>FARMER, DEREK A </b></span>
<span id="CertHeader0">COMMERCIAL PILOT</span>
<div id="TabBody0" style="display:block"><label class="Cert_Info"><b>Certificate:</b>&nbsp;COMMERCIAL PILOT</label><br/><br/><label class="Cert_Info"><b>Ratings:</b> <br/><u>COMMERCIAL PILOT</u><br/>&nbsp;&nbsp;AIRPLANE SINGLE ENGINE LAND<br/>&nbsp;&nbsp;INSTRUMENT AIRPLANE</label></div>
<span id="CertHeader1">FLIGHT INSTRUCTOR</span>
<div id="TabBody1" style="display:block"><label class="Cert_Info"><b>Certificate:</b>&nbsp;FLIGHT INSTRUCTOR</label><br/><br/><label class="Cert_Info"><b>Ratings:</b> <br/><u>FLIGHT INSTRUCTOR</u><br/>&nbsp;&nbsp;AIRPLANE SINGLE ENGINE<br/>&nbsp;&nbsp;INSTRUMENT AIRPLANE</label></div>
<div id="TabBody2" style="display:none"></div>
`

describe('parseAirmenDetailHtml', () => {
  it('parses name, certificate levels, ratings, and type ratings in title case', () => {
    const data = parseAirmenDetailHtml(SAMPLE_DETAIL_HTML)
    expect(data).not.toBeNull()
    expect(data?.name).toBe('Charles Elwood Yeager')
    expect(data?.certificateLevels).toContain('Commercial Pilot')
    expect(data?.ratings.some((r) => r.includes('Airplane Single Engine Land'))).toBe(true)
    expect(data?.typeRatings).toContain('C/L-18')
    expect(data?.certificates).toMatch(/Commercial Pilot/)
    expect(data?.medicalClass).toBe('Third')
    expect(data?.medicalDate).toBe('6/2014')
  })

  it('includes flight instructor certificate and ratings from additional tabs', () => {
    const data = parseAirmenDetailHtml(SAMPLE_WITH_INSTRUCTOR_HTML)
    expect(data).not.toBeNull()
    expect(data?.name).toBe('Derek A Farmer')
    expect(data?.certificateLevels).toContain('Commercial Pilot')
    expect(data?.certificateLevels).toContain('Flight Instructor')
    expect(data?.ratings).toContain('Airplane Single Engine')
    expect(data?.certificates).toMatch(/Commercial Pilot[\s\S]*\n\n[\s\S]*Flight Instructor/)
    expect(data?.certificates).toMatch(/Instrument Airplane/)
  })

  it('returns null for non-detail pages', () => {
    expect(parseAirmenDetailHtml('<html><body>No records found</body></html>')).toBeNull()
  })

  it('ignores embedded JavaScript and FAA footer boilerplate', () => {
    const html = `
<span id="ctl00_content_ctl01_ctl00_lbName"><b>PILOT, TEST A</b></span>
<span id="CertHeader0">AIRLINE TRANSPORT PILOT</span>
<div id="TabBody0"><label class="Cert_Info"><b>Certificate:</b>&nbsp;AIRLINE TRANSPORT PILOT<br/><b>Ratings:</b><br/>&nbsp;&nbsp;AIRPLANE MULTIENGINE LAND<br/>&nbsp;&nbsp;AIRPLANE SINGLE ENGINE LAND<br/><b>Type Ratings:</b><table><tr><td>A/ERJ-170</td><td>A/ERJ-190</td></tr></table></label></div>
<span id="CertHeader1">FLIGHT INSTRUCTOR</span>
<div id="TabBody1"><label class="Cert_Info"><b>Certificate:</b>&nbsp;FLIGHT INSTRUCTOR<br/><b>Ratings:</b><br/>&nbsp;&nbsp;AIRPLANE SINGLE ENGINE<br/>&nbsp;&nbsp;INSTRUMENT AIRPLANE</label></div>
<span id="CertHeader2">GROUND INSTRUCTOR</span>
<div id="TabBody2"><label class="Cert_Info"><b>Certificate:</b>&nbsp;ADVANCED GROUND INSTRUCTOR</label></div>
<script>
content += ' · ';
content += document.getElementById("divPersonalInfo").innerHTML;
content += ' Federal Aviation Administration · 800 Independence Avenue, SW';
for (i = 0; i < 5; i++) { content += document.getElementById("TabBody" + Selected).innerHTML; }
</script>
`
    const data = parseAirmenDetailHtml(html)
    expect(data).not.toBeNull()
    expect(data?.certificates).not.toMatch(/document\.|getelementbyid|content \+=/i)
    expect(data?.certificates).not.toMatch(/Federal Aviation Administration/i)
    expect(data?.certificateLevels).toContain('Airline Transport Pilot')
    expect(data?.certificateLevels).toContain('Flight Instructor')
    expect(data?.certificateLevels).toContain('Ground Instructor')
    expect(data?.typeRatings).toEqual(expect.arrayContaining(['A/ERJ-170', 'A/ERJ-190']))
    expect(data?.certificates).toMatch(/Type ratings: A\/ERJ-170, A\/ERJ-190/)
    expect(data?.certificates).toMatch(/\n\n[\s\S]*Flight Instructor/)
  })
})

describe('extractCandidates', () => {
  it('parses postback links with HTML-encoded quotes', () => {
    const html = `
      <a id="ctl00_content_ctl01_gvAirmen_lnkbtnAirmenName_0"
        href="javascript:__doPostBack(&#39;ctl00$content$ctl01$gvAirmen$ctl02$lnkbtnAirmenName&#39;,&#39;&#39;)">
        SMITH, JOHN A
      </a>
    `
    const candidates = extractCandidates(html)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.displayName).toBe('John A Smith')
    expect(candidates[0]?.eventTarget).toBe('ctl00$content$ctl01$gvAirmen$ctl02$lnkbtnAirmenName')
  })
})
