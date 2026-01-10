import{r as b,j as e}from"./radix-CQCJLaWg.js";import{u as H,o as oe,B as P}from"./index-CjktbCEP.js";import{N as ne,ap as re,a0 as ie}from"./utils-rckWkIcR.js";const ae=`
@media print {
  body * {
    visibility: hidden;
  }
  .print-content, .print-content * {
    visibility: visible;
  }
  .print-content {
    position: absolute;
    left: 0;
    top: 0;
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    border: none;
    overflow: hidden;
  }
  @page {
    size: A4;
    margin: 0;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
}
`;function se({student:w,studentClass:N,result:t,detailedScores:u,showActions:v=!1,onDownload:z,onPrint:C,onApprovePrint:M,currentUser:S}){const{schoolSettings:s,loadSchoolSettings:R,students:F,classes:T,teachers:W,scores:p,subjectAssignments:g,subjects:j,affectiveDomains:f,psychomotorDomains:L,loadScoresFromAPI:O,loadSubjectAssignmentsFromAPI:U,loadSubjectsFromAPI:G,loadAffectiveDomainsFromAPI:$,loadPsychomotorDomainsFromAPI:K,getClassTeacher:V}=H(),[de,le]=b.useState(!1),[I,A]=b.useState([]);b.useEffect(()=>{s?.resumption_date||R()},[s?.resumption_date,R]),b.useEffect(()=>{const o=document.createElement("style");return o.textContent=ae,document.head.appendChild(o),()=>{document.head.removeChild(o)}},[]);const X=()=>{window.print()};b.useEffect(()=>{t&&t.student_id&&(Q(),Y())},[t]);const Y=async()=>{if(!(!t||!t.student_id))try{await Promise.all([f.length===0&&$(),L.length===0&&K()])}catch(o){console.error("Error loading domain data:",o)}},q=()=>!t||!t.student_id?{}:f.find(n=>n.student_id===t.student_id&&n.academic_year===t.academic_year&&n.term===t.term)||{},J=()=>!t||!t.student_id?{}:L.find(n=>n.student_id===t.student_id&&n.academic_year===t.academic_year&&n.term===t.term)||{},Q=async()=>{if(!(!t||!t.student_id))try{await Promise.all([p.length===0&&O(),g.length===0&&U(),j.length===0&&G()]);let o=p.filter(n=>n.student_id===t.student_id&&n.academic_year===t.academic_year&&n.term===t.term);if(o=o.map(n=>{const a=g.find(d=>d.id===n.subject_assignment_id),l=a?j.find(d=>d.id===a.subject_id):null,_=a?W.find(d=>d.id===a.teacher_id):null,y=p.filter(d=>{const r=g.find(k=>k.id===d.subject_assignment_id);return r&&r.subject_id===a?.subject_id&&d.academic_year===t.academic_year&&d.term===t.term&&d.total>0}).map(d=>d.total||0),h=y.length>0?y.reduce((d,r)=>d+r,0)/y.length:0,D=y.length>0?Math.min(...y):0,B=y.length>0?Math.max(...y):0;return{...n,subject_name:l?l.name:n.subject_name||"Unknown Subject",subject_teacher:_?`${_.firstName} ${_.lastName}`:"Not Assigned",class_average:parseFloat(h.toFixed(2)),class_minimum:D,class_maximum:B}}).sort((n,a)=>n.subject_name.localeCompare(a.subject_name)),u&&u.length>0)A(u);else if(t.scores&&t.scores.length>0){const n=t.scores.map(a=>{const l=g.find(r=>r.id===a.subject_assignment_id),_=l?j.find(r=>r.id===l.subject_id):null,E=l?W.find(r=>r.id===l.teacher_id):null,h=p.filter(r=>{const k=g.find(te=>te.id===r.subject_assignment_id);return k&&k.subject_id===l?.subject_id&&r.academic_year===t.academic_year&&r.term===t.term&&r.total>0}).map(r=>r.total||0),D=h.length>0?h.reduce((r,k)=>r+k,0)/h.length:0,B=h.length>0?Math.min(...h):0,d=h.length>0?Math.max(...h):0;return{...a,subject_name:_?_.name:a.subject_name||"Unknown Subject",subject_teacher:E?`${E.firstName} ${E.lastName}`:"Not Assigned",class_average:parseFloat(D.toFixed(2)),class_minimum:B,class_maximum:d}}).sort((a,l)=>a.subject_name.localeCompare(l.subject_name));A(n)}else A(o)}catch(o){console.error("Error loading detailed scores:",o),A([])}},x=w||F.find(o=>o.id===t.student_id),i=N||T.find(o=>o.id===t.class_id),Z=()=>{if(t?.class_teacher_name&&t.class_teacher_name.trim()!=="")return t.class_teacher_name;if(i?.classTeacher)return i.classTeacher;if(i?.classTeacherId){const o=W.find(n=>n.id===i.classTeacherId);if(o)return`${o.firstName} ${o.lastName}`}if(i?.id){const o=V(i.id);if(o)return`${o.firstName} ${o.lastName}`}return"_________________"},ee=o=>o>=80?{grade:"A",remark:"Excellent"}:o>=70?{grade:"B",remark:"Very Good"}:o>=60?{grade:"C",remark:"Good"}:o>=50?{grade:"D",remark:"Satisfactory"}:o>=45?{grade:"E",remark:"Fair"}:{grade:"F",remark:"Fail"},c=o=>o===5?"Excellent":o===4?"Very Good":o===3?"Good":o===2?"Fair":"Poor",m=o=>{const n={attentiveness:"Attentiveness",honesty:"Honesty",neatness:"Neatness",obedience:"Obedience",sense_of_responsibility:"Sense of Responsibility"},a={attention_to_direction:"Attention to Direction",considerate_of_others:"Considerate of Others",handwriting:"Handwriting",sports:"Sports",verbal_fluency:"Verbal Fluency",works_well_independently:"Works Well Independently"};return n[o]||a[o]||o.replace(/_/g," ").replace(/(?:^|\s)\S/g,l=>l.toUpperCase())};return S?.role==="admin"||t.print_approved,e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
            orientation: portrait;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', serif;
            font-size: 10pt;
            line-height: 1.2;
            width: 100%;
            height: 100vh;
            overflow: hidden;
          }
          
          .print-container {
            width: 100%;
            max-width: 190mm;
            min-height: 277mm;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
            padding: 4mm;
            background: white;
          }
          
          .print-header {
            page-break-after: auto;
            page-break-inside: avoid;
          }
          
          .print-table {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-section {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .print-affective-psychomotor {
            page-break-inside: avoid;
            display: flex !important;
            gap: 2mm !important;
          }
          
          .print-watermark {
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 140mm !important;
            height: 140mm !important;
            opacity: 0.12 !important;
            z-index: 0 !important;
            pointer-events: none !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }
          
          .print-content {
            position: relative !important;
            z-index: 1 !important;
          }
          
          table {
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
          
          td, th {
            page-break-inside: avoid !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        }
      `}),e.jsx("div",{className:"print-container bg-white no-print",style:{fontFamily:'"Times New Roman", serif',width:"210mm",height:"297mm",margin:"0 auto",padding:"8mm",boxSizing:"border-box",backgroundColor:"white",overflow:"hidden",position:"relative",border:"3px double #2c3e50",boxShadow:"0 0 20px rgba(0,0,0,0.1)",background:"linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)"},children:e.jsxs("div",{className:"print-content",style:{position:"absolute",left:"-8mm",top:"-8mm",width:"210mm",height:"297mm",zIndex:1,textRendering:"geometricPrecision",fontSmooth:"always",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",WebkitTextStroke:"0.01px transparent",textShadow:"0 0 0.01px rgba(0,0,0,0.01)",letterSpacing:"0.01px",lineHeight:"1.1",fontWeight:"500",backgroundColor:"white",padding:"8mm",boxSizing:"border-box",border:"3px double #2c3e50"},children:[e.jsxs("div",{className:"print-header",style:{textAlign:"center",marginBottom:"3mm",padding:"2mm 0"},children:[e.jsx("div",{style:{marginBottom:"1mm"},children:e.jsx("img",{src:oe,alt:"School Logo",style:{width:"18mm",height:"18mm",display:"block",margin:"0 auto",borderRadius:"50%",border:"2px solid #2c3e50",objectFit:"cover",backgroundColor:"#ffffff",imageRendering:"auto",WebkitImageRendering:"auto"},onError:o=>{console.error("School logo failed to load:",o);const n=o.target;n.src="./assets/images/graceland-logo.jpg"},onLoad:o=>{console.log("School logo loaded successfully")}})}),e.jsx("h1",{style:{fontSize:"14pt",fontWeight:"bold",margin:"0.5mm 0",textTransform:"uppercase",color:"#2c3e50",letterSpacing:"1px",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:s.school_name||"SCHOOL NAME"}),e.jsx("p",{style:{fontSize:"8pt",margin:"0.3mm 0",fontStyle:"italic",color:"#555",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:s.school_address||"SCHOOL ADDRESS"}),e.jsx("p",{style:{fontSize:"8pt",margin:"0.3mm 0",color:"#555",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:s.school_email||"school@email.com"}),e.jsx("div",{style:{marginTop:"1mm",borderBottom:"2px solid #2c3e50",width:"80%",margin:"1mm auto 0"}})]}),e.jsxs("div",{className:"print-section",style:{marginBottom:"2mm",display:"flex",gap:"1mm",justifyContent:"center",alignItems:"stretch"},children:[e.jsx("div",{style:{width:"75%"},children:e.jsx("table",{style:{width:"100%",borderCollapse:"collapse",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",height:"18mm",pageBreakInside:"avoid"},children:e.jsxs("tbody",{children:[e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Name:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:x?`${x.firstName} ${x.lastName}`.toUpperCase():"STUDENT NAME"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Session:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:t.academic_year||"2024/2025"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:i?.name||"CLASS NAME"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:x?.gender||"MALE"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:"Next Term Begins:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},colSpan:5,children:t?.next_term_begin||s?.resumption_date||""})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Admission No:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:x?.admissionNumber||"GRA/XXXXX"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Term:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:t.term||"THIRD TERM"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Attendance:"}),e.jsxs("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:[t.times_present||0," / ",t.total_attendance_days||0," days"]})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Class:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:i?.name||"CLASS NAME"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Gender:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:x?.gender||"MALE"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Next Term Begins:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},colSpan:5,children:t?.next_term_begin||s?.resumption_date||""})]})]})})}),e.jsx("div",{style:{width:"25%"},children:e.jsx("div",{className:"border border-black",style:{height:"18mm",display:"flex",alignItems:"center",justifyContent:"center"},children:x?.photo_url?e.jsx("img",{src:x.photo_url,alt:"Student Photo",style:{width:"100%",height:"100%",objectFit:"cover"}}):e.jsx("div",{style:{width:"100%",height:"100%",backgroundColor:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{fontSize:"9pt",color:"#666"},children:"No Photo"})})})})]}),e.jsx("div",{style:{textAlign:"center",marginBottom:"1mm",padding:"1mm 0"},children:e.jsxs("h2",{style:{fontSize:"13pt",fontWeight:"bold",textDecoration:"underline",margin:"0.5mm 0",textTransform:"uppercase",color:"#2c3e50",letterSpacing:"2px",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:[t.term||"THIRD TERM"," RESULT SHEET"]})}),e.jsx("div",{style:{display:"flex",justifyContent:"center",marginBottom:"1mm"},children:e.jsxs("table",{className:"print-table",style:{fontSize:"7pt",width:"95%",borderCollapse:"collapse",border:"2px solid #2c3e50",backgroundColor:"white",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid",pageBreakAfter:"auto",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{backgroundColor:"#2c3e50",color:"white"},children:[e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"3%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"SN"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"16%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"SUBJECT"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"1st CA"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"2nd CA"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Exams"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Total"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"5%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Grd"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"8%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Remark"})]})}),e.jsx("tbody",{children:I&&I.length>0?I.map((o,n)=>{const a=ee(o.total||0);return e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:n+1}),e.jsx("td",{className:"border border-black",style:{padding:"0.4mm",fontSize:"7pt"},children:o.subject_name||"Subject"}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:o.ca1||0}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:o.ca2||0}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:o.exam||0}),e.jsx("td",{className:"border border-black text-center font-bold",style:{padding:"0.4mm",textAlign:"center",fontWeight:"bold",fontSize:"7pt"},children:o.total||0}),e.jsx("td",{className:"border border-black text-center font-bold",style:{padding:"0.4mm",textAlign:"center",fontWeight:"bold",fontSize:"7pt"},children:a.grade}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"4pt"},children:a.remark})]},n)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"border border-black p-2 text-center text-gray-500",style:{padding:"1.5mm",fontSize:"7pt"},children:"No scores available"})})})]})}),e.jsx("div",{style:{display:"flex",justifyContent:"center",marginBottom:"1mm"},children:e.jsx("table",{className:"print-table",style:{marginTop:"0.8mm",fontSize:"6pt",width:"95%",borderCollapse:"collapse",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid"},children:e.jsx("tbody",{children:e.jsxs("tr",{children:[e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"TOTAL:"})," ",t.total_score||"0.00"]}),e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"AVG:"})," ",t.average_score||"0.00"]}),e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"CLASS AVG:"})," ",t.class_average||"0.00"]}),!i?.name?.toUpperCase().includes("CRECHE")&&!i?.name?.toUpperCase().includes("KG1")&&!i?.name?.toUpperCase().includes("KG2")&&!i?.name?.toUpperCase().includes("KG 1")&&!i?.name?.toUpperCase().includes("KG 2")&&!i?.name?.toUpperCase().includes("KINDERGARTEN")&&e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"POS:"})," ",t.position?`${t.position}${t.position===1?"st":t.position===2?"nd":t.position===3?"rd":"th"}`:"___"]})]})})})}),e.jsxs("div",{style:{display:"flex",justifyContent:"center",marginTop:"2mm",marginBottom:"1.5mm",gap:"2mm"},children:[e.jsxs("div",{className:"border border-black p-1",style:{padding:"2mm",fontSize:"6pt",width:"47%",minHeight:"25mm",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid",overflow:"visible"},children:[e.jsx("p",{style:{margin:"0.3mm 0",fontSize:"7pt",fontWeight:"bold",color:"#2c3e50"},children:"CLASS TEACHER"}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt"},children:[e.jsx("b",{children:"Name:"})," ",Z()]}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt",whiteSpace:"pre-wrap",wordWrap:"break-word",maxWidth:"100%",overflow:"visible",lineHeight:"1.2"},children:[e.jsx("b",{children:"Comment:"})," ",t?.class_teacher_comment||t?.comment||"Teacher comment will appear here."]})]}),e.jsxs("div",{className:"border border-black p-1",style:{padding:"2mm",fontSize:"6pt",width:"47%",minHeight:"30mm",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid",overflow:"visible"},children:[e.jsx("p",{style:{margin:"0.3mm 0",fontSize:"7pt",fontWeight:"bold",color:"#2c3e50"},children:i?.category==="Primary"?"HEAD TEACHER":"PRINCIPAL"}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt"},children:[e.jsx("b",{children:"Name:"}),i?.category==="Primary"?` ${s?.head_teacher_name||"_________________"}`:` ${s?.principal_name||"_________________"}`]}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt",whiteSpace:"pre-wrap",wordWrap:"break-word",maxWidth:"100%",overflow:"visible",lineHeight:"1.2"},children:[e.jsx("b",{children:"Comment:"})," ",i?.category==="Primary"?t?.principal_comment||s?.head_teacher_comment||"Head teacher comment will appear here.":t?.principal_comment||s?.principal_comment||"Principal comment will appear here."]}),e.jsx("div",{style:{marginTop:"1mm",marginBottom:"0.5mm",fontSize:"7pt"},children:e.jsx("b",{children:"Signature:"})}),e.jsx("div",{style:{borderBottom:"1px solid black",height:"8mm",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"},children:i?.category==="Primary"?s?.head_teacher_signature?e.jsx("img",{src:s.head_teacher_signature,alt:"Head Teacher Signature",style:{maxWidth:"100%",maxHeight:"6mm",objectFit:"contain"}}):e.jsx("span",{style:{color:"#999",fontSize:"4pt"}}):s?.principal_signature?e.jsx("img",{src:s.principal_signature,alt:"Principal Signature",style:{maxWidth:"100%",maxHeight:"6mm",objectFit:"contain"}}):e.jsx("span",{style:{color:"#999",fontSize:"4pt"}})})]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"center",gap:"2mm",marginBottom:"1mm",alignItems:"flex-start"},children:[e.jsxs("div",{style:{width:"48%"},children:[e.jsx("div",{className:"text-center mb-1",children:e.jsx("h3",{className:"font-bold underline",style:{fontSize:"10pt",marginBottom:"0.5mm",color:"#2c3e50",letterSpacing:"1px"},children:"AFFECTIVE"})}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",border:"1px solid black",fontSize:"6pt",boxShadow:"0 1px 2px rgba(0,0,0,0.1)",pageBreakInside:"avoid",tableLayout:"fixed"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{backgroundColor:"#1a252f",color:"white"},children:[e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"50%"},children:"QUALITY"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"20%"},children:"SCORE"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"30%"},children:"REMARK"})]})}),e.jsx("tbody",{children:(()=>{const o=q();return e.jsxs(e.Fragment,{children:[e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("attentiveness")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.attentiveness||t.affective?.attentiveness||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.attentiveness||t.affective?.attentiveness||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("honesty")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.honesty||t.affective?.honesty||"3"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.honesty||t.affective?.honesty||3))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("neatness")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.neatness||t.affective?.neatness||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.neatness||t.affective?.neatness||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("obedience")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.obedience||t.affective?.obedience||"2"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.obedience||t.affective?.obedience||2))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("sense_of_responsibility")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.sense_of_responsibility||t.affective?.sense_of_responsibility||"3"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.sense_of_responsibility||t.affective?.sense_of_responsibility||3))})]})]})})()})]})]}),e.jsxs("div",{style:{width:"48%"},children:[e.jsx("div",{className:"text-center mb-1",children:e.jsx("h3",{className:"font-bold underline",style:{fontSize:"10pt",marginBottom:"0.5mm",color:"#2c3e50",letterSpacing:"1px"},children:"PSYCHOMOTOR"})}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",border:"1px solid black",fontSize:"7pt",boxShadow:"0 1px 2px rgba(0,0,0,0.1)",pageBreakInside:"avoid",tableLayout:"fixed"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{backgroundColor:"#1a252f",color:"white"},children:[e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"50%"},children:"SKILL"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"20%"},children:"SCORE"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"30%"},children:"REMARK"})]})}),e.jsx("tbody",{children:(()=>{const o=J();return e.jsxs(e.Fragment,{children:[e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("attention_to_direction")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.attention_to_direction||t.psychomotor?.attention_to_direction||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.attention_to_direction||t.psychomotor?.attention_to_direction||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("considerate_of_others")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.considerate_of_others||t.psychomotor?.considerate_of_others||"2"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.considerate_of_others||t.psychomotor?.considerate_of_others||2))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("handwriting")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.handwriting||t.psychomotor?.handwriting||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.handwriting||t.psychomotor?.handwriting||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("sports")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.sports||t.psychomotor?.sports||"3"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.sports||t.psychomotor?.sports||3))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("verbal_fluency")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.verbal_fluency||t.psychomotor?.verbal_fluency||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.verbal_fluency||t.psychomotor?.verbal_fluency||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:m("works_well_independently")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:o.works_well_independently||t.psychomotor?.independent_work||"5"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:c(parseInt(o.works_well_independently||t.psychomotor?.independent_work||5))})]})]})})()})]})]})]})]})}),v&&e.jsxs("div",{className:"no-print",style:{textAlign:"center",marginTop:"20px",marginBottom:"20px",padding:"10px"},children:[e.jsx(P,{onClick:X,className:"bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded",style:{marginRight:"8px"},children:"Print Result (Ctrl+P)"}),z&&e.jsx(P,{onClick:()=>z(t.id),className:"bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded",children:"Download PDF"})]})]})}function ge({studentId:w,resultId:N,onClose:t}){const{students:u,classes:v,compiledResults:z}=H(),[C,M]=b.useState(null),[S,s]=b.useState(null),[R,F]=b.useState(null);b.useEffect(()=>{const p=u.find(f=>f.id===w),g=z.find(f=>f.id===N),j=v.find(f=>f.id===g?.class_id);console.log("=== FULL PAGE RESULT VIEW DEBUG ==="),console.log("Student ID:",w),console.log("Result ID:",N),console.log("Found Student:",p),console.log("Found Result:",g),console.log("Found Result class_id:",g?.class_id),console.log("Available Classes:",v),console.log("Found Class:",j),console.log("Class Name:",j?.name||"NOT FOUND"),M(p),s(g),F(j)},[w,N,u,z,v]);const T=()=>{window.print()},W=()=>{const p=document.querySelector("[data-download-pdf]");p&&p.click()};return!C||!S?e.jsx("div",{className:"min-h-screen bg-gray-100 flex items-center justify-center",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"}),e.jsx("p",{className:"text-gray-600",children:"Loading result..."})]})}):e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
        @media screen {
          body {
            margin: 0;
            padding: 0;
            overflow-x: auto;
            background: #f3f4f6;
          }
          
          .full-page-container {
            background: #f3f4f6;
            min-height: 100vh;
            padding: 2rem 0;
          }
          
          .no-print {
            display: block !important;
          }
          
          .print-only {
            display: none !important;
          }
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            overflow: visible !important;
          }
          
          .full-page-container {
            background: white !important;
            padding: 0 !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .full-page-container {
            background: white !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .bg-white.shadow-2xl.mx-auto {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}),e.jsxs("div",{className:"min-h-screen bg-gray-100",children:[e.jsx("div",{className:"no-print bg-white shadow-md border-b border-gray-200 sticky top-0 z-50",children:e.jsx("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",children:e.jsxs("div",{className:"flex justify-between items-center py-4",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs(P,{variant:"outline",onClick:t,className:"flex items-center gap-2",children:[e.jsx(ne,{className:"w-4 h-4"}),"Back to Results"]}),e.jsxs("div",{children:[e.jsxs("h1",{className:"text-xl font-semibold text-gray-900",children:[C.firstName," ",C.lastName," - Result Sheet"]}),e.jsxs("p",{className:"text-sm text-gray-600",children:[R?.name," • ",S.term," • ",S.academic_year]})]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs(P,{variant:"outline",onClick:T,className:"flex items-center gap-2",children:[e.jsx(re,{className:"w-4 h-4"}),"Print"]}),e.jsxs(P,{variant:"outline",onClick:W,className:"flex items-center gap-2","data-download-pdf":!0,children:[e.jsx(ie,{className:"w-4 h-4"}),"Download PDF"]})]})]})})}),e.jsx("div",{className:"full-page-container py-8",children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsx("div",{className:"bg-white shadow-2xl mx-auto overflow-auto",style:{width:"210mm",minHeight:"297mm",maxWidth:"100%",aspectRatio:"210/297",overflow:"visible"},children:e.jsx("div",{className:"transform-gpu",style:{transform:"scale(1)",transformOrigin:"top center",width:"100%",height:"100%",overflow:"visible"},children:e.jsx(se,{student:C,studentClass:R,result:S,showActions:!1,currentUser:{role:"admin"}})})}),e.jsxs("div",{className:"no-print mt-8 text-center text-gray-600",children:[e.jsx("p",{className:"text-sm",children:"This is displayed in A4 format. Use the Print button to print or Download PDF to save."}),e.jsx("p",{className:"text-xs mt-2",children:"The result sheet is optimized for A4 paper size (210mm × 297mm)."})]})]})})]})]})}export{ge as F,se as S};
