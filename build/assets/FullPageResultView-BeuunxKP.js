var je=Object.defineProperty,_e=Object.defineProperties;var ke=Object.getOwnPropertyDescriptors;var re=Object.getOwnPropertySymbols;var Se=Object.prototype.hasOwnProperty,we=Object.prototype.propertyIsEnumerable;var ie=(m,l,t)=>l in m?je(m,l,{enumerable:!0,configurable:!0,writable:!0,value:t}):m[l]=t,V=(m,l)=>{for(var t in l||(l={}))Se.call(l,t)&&ie(m,t,l[t]);if(re)for(var t of re(l))we.call(l,t)&&ie(m,t,l[t]);return m},X=(m,l)=>_e(m,ke(l));var Y=(m,l,t)=>new Promise((_,v)=>{var u=p=>{try{C(t.next(p))}catch(o){v(o)}},W=p=>{try{C(t.throw(p))}catch(o){v(o)}},C=p=>p.done?_(p.value):Promise.resolve(p.value).then(u,W);C((t=t.apply(m,l)).next())});import{r as N,j as e}from"./radix-iRPhyIl_.js";import{u as oe,o as Ne,B as I}from"./index-t5cEl6fh.js";import{H as ve,ap as ue,_ as ze}from"./utils-C1OHf7u_.js";const Ae=`
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
`;function We({student:m,studentClass:l,result:t,detailedScores:_,showActions:v=!1,onDownload:u,onPrint:W,onApprovePrint:C,currentUser:p}){var J,Q,D,Z,ee,te;const{schoolSettings:o,loadSchoolSettings:P,students:B,classes:M,teachers:H,scores:z,subjectAssignments:F,subjects:T,affectiveDomains:E,psychomotorDomains:A,loadScoresFromAPI:G,loadSubjectAssignmentsFromAPI:R,loadSubjectsFromAPI:ne,loadAffectiveDomainsFromAPI:ae,loadPsychomotorDomainsFromAPI:de,getClassTeacher:se}=oe(),[Pe,Re]=N.useState(!1),[$,O]=N.useState([]);N.useEffect(()=>{o!=null&&o.resumption_date||P()},[o==null?void 0:o.resumption_date,P]),N.useEffect(()=>{const r=document.createElement("style");return r.textContent=Ae,document.head.appendChild(r),()=>{document.head.removeChild(r)}},[]);const ce=()=>{window.print()};N.useEffect(()=>{t&&t.student_id&&(he(),le())},[t]);const le=()=>Y(null,null,function*(){if(!(!t||!t.student_id))try{yield Promise.all([E.length===0&&ae(),A.length===0&&de()])}catch(r){}}),me=()=>!t||!t.student_id?{}:(Array.isArray(E)?E:[]).find(n=>n.student_id===t.student_id&&n.academic_year===t.academic_year&&n.term===t.term)||{},pe=()=>!t||!t.student_id?{}:(Array.isArray(A)?A:[]).find(n=>n.student_id===t.student_id&&n.academic_year===t.academic_year&&n.term===t.term)||{},he=()=>Y(null,null,function*(){if(!(!t||!t.student_id))try{yield Promise.all([z.length===0&&G(),F.length===0&&R(),T.length===0&&ne()]);let r=K.filter(a=>a.student_id===t.student_id&&a.academic_year===t.academic_year&&a.term===t.term);if(r=r.map(a=>{const n=L.find(d=>d.id===a.subject_assignment_id),c=n?q.find(d=>d.id===n.subject_id):null,f=n?U.find(d=>d.id===n.teacher_id):null,g=K.filter(d=>{const s=L.find(w=>w.id===d.subject_assignment_id);return s&&s.subject_id===(n==null?void 0:n.subject_id)&&d.academic_year===t.academic_year&&d.term===t.term&&d.total>0}).map(d=>d.total||0),b=g.length>0?g.reduce((d,s)=>d+s,0)/g.length:0,k=g.length>0?Math.min(...g):0,S=g.length>0?Math.max(...g):0;return X(V({},a),{subject_name:c?c.name:a.subject_name||"Unknown Subject",subject_teacher:f?`${f.firstName} ${f.lastName}`:"Not Assigned",class_average:parseFloat(b.toFixed(2)),class_minimum:k,class_maximum:S})}).sort((a,n)=>a.subject_name.localeCompare(n.subject_name)),_&&_.length>0)O(_);else if(t.scores&&t.scores.length>0){const a=t.scores.map(n=>{const c=L.find(s=>s.id===n.subject_assignment_id),f=c?q.find(s=>s.id===c.subject_id):null,j=c?U.find(s=>s.id===c.teacher_id):null,b=K.filter(s=>{const w=L.find(ye=>ye.id===s.subject_assignment_id);return w&&w.subject_id===(c==null?void 0:c.subject_id)&&s.academic_year===t.academic_year&&s.term===t.term&&s.total>0}).map(s=>s.total||0),k=b.length>0?b.reduce((s,w)=>s+w,0)/b.length:0,S=b.length>0?Math.min(...b):0,d=b.length>0?Math.max(...b):0;return X(V({},n),{subject_name:f?f.name:n.subject_name||"Unknown Subject",subject_teacher:j?`${j.firstName} ${j.lastName}`:"Not Assigned",class_average:parseFloat(k.toFixed(2)),class_minimum:S,class_maximum:d})}).sort((n,c)=>n.subject_name.localeCompare(c.subject_name));O(a)}else O(r)}catch(r){O([])}}),be=Array.isArray(B)?B:[],ge=Array.isArray(M)?M:[],U=Array.isArray(H)?H:[],L=Array.isArray(F)?F:[],q=Array.isArray(T)?T:[],K=Array.isArray(z)?z:[],h=m||be.find(r=>r.id===t.student_id),i=l||ge.find(r=>r.id===t.class_id),fe=()=>{if(t!=null&&t.class_teacher_name&&t.class_teacher_name.trim()!=="")return t.class_teacher_name;if(i!=null&&i.classTeacher)return i.classTeacher;if(i!=null&&i.classTeacherId){const r=U.find(a=>a.id===i.classTeacherId);if(r)return`${r.firstName} ${r.lastName}`}if(i!=null&&i.id){const r=se(i.id);if(r)return`${r.firstName} ${r.lastName}`}return"_________________"},xe=r=>r>=80?{grade:"A",remark:"Excellent"}:r>=70?{grade:"B",remark:"Very Good"}:r>=60?{grade:"C",remark:"Good"}:r>=50?{grade:"D",remark:"Satisfactory"}:r>=45?{grade:"E",remark:"Fair"}:{grade:"F",remark:"Fail"},x=r=>r===5?"Excellent":r===4?"Very Good":r===3?"Good":r===2?"Fair":"Poor",y=r=>{const a={attentiveness:"Attentiveness",honesty:"Honesty",neatness:"Neatness",obedience:"Obedience",sense_of_responsibility:"Sense of Responsibility"},n={attention_to_direction:"Attention to Direction",considerate_of_others:"Considerate of Others",handwriting:"Handwriting",sports:"Sports",verbal_fluency:"Verbal Fluency",works_well_independently:"Works Well Independently"};return a[r]||n[r]||r.replace(/_/g," ").replace(/(?:^|\s)\S/g,c=>c.toUpperCase())};return(p==null?void 0:p.role)==="admin"||t.print_approved,e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"print-container bg-white no-print",style:{fontFamily:'"Times New Roman", serif',width:"210mm",height:"297mm",margin:"0 auto",padding:"8mm",boxSizing:"border-box",backgroundColor:"white",overflow:"hidden",position:"relative",border:"3px double #2c3e50",boxShadow:"0 0 20px rgba(0,0,0,0.1)",background:"linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)"},children:e.jsxs("div",{className:"print-content",style:{position:"absolute",left:"-8mm",top:"-8mm",width:"210mm",height:"297mm",zIndex:1,textRendering:"geometricPrecision",fontSmooth:"always",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",WebkitTextStroke:"0.01px transparent",textShadow:"0 0 0.01px rgba(0,0,0,0.01)",letterSpacing:"0.01px",lineHeight:"1.1",fontWeight:"500",backgroundColor:"white",padding:"8mm",boxSizing:"border-box",border:"3px double #2c3e50"},children:[e.jsxs("div",{className:"print-header",style:{textAlign:"center",marginBottom:"3mm",padding:"2mm 0"},children:[e.jsx("div",{style:{marginBottom:"1mm"},children:e.jsx("img",{src:Ne,alt:"School Logo",style:{width:"18mm",height:"18mm",display:"block",margin:"0 auto",borderRadius:"50%",border:"2px solid #2c3e50",objectFit:"cover",backgroundColor:"#ffffff",imageRendering:"auto",WebkitImageRendering:"auto"},onError:r=>{const a=r.target;a.src="./assets/images/school-logo.jpg"}})}),e.jsx("h1",{style:{fontSize:"14pt",fontWeight:"bold",margin:"0.5mm 0",textTransform:"uppercase",color:"#2c3e50",letterSpacing:"1px",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:o.school_name||"SCHOOL NAME"}),e.jsx("p",{style:{fontSize:"8pt",margin:"0.3mm 0",fontStyle:"italic",color:"#555",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:o.school_address||"SCHOOL ADDRESS"}),e.jsx("p",{style:{fontSize:"8pt",margin:"0.3mm 0",color:"#555",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:o.school_email||"school@email.com"}),e.jsx("p",{style:{fontSize:"8pt",margin:"0.3mm 0",color:"#555",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:o.school_phone||"+234-800-000-0000"}),e.jsx("div",{style:{marginTop:"1mm",borderBottom:"2px solid #2c3e50",width:"80%",margin:"1mm auto 0"}})]}),e.jsxs("div",{className:"print-section",style:{marginBottom:"2mm",display:"flex",gap:"1mm",justifyContent:"center",alignItems:"stretch"},children:[e.jsx("div",{style:{width:"75%"},children:e.jsx("table",{style:{width:"100%",borderCollapse:"collapse",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",height:"18mm",pageBreakInside:"avoid"},children:e.jsxs("tbody",{children:[e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Name:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:h?`${h.firstName} ${h.lastName}`.toUpperCase():"STUDENT NAME"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Session:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:t.academic_year||"2024/2025"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:(i==null?void 0:i.name)||"CLASS NAME"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:(h==null?void 0:h.gender)||"MALE"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:"Next Term Begins:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},colSpan:5,children:(t==null?void 0:t.next_term_begin)||(o==null?void 0:o.resumption_date)||""})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Admission No:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:(h==null?void 0:h.admissionNumber)||"GRA/XXXXX"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Term:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:t.term||"THIRD TERM"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Attendance:"}),e.jsxs("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:[t.times_present||0," / ",t.total_attendance_days||0," days"]})]}),e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Class:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:(i==null?void 0:i.name)||"CLASS NAME"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Gender:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},children:(h==null?void 0:h.gender)||"MALE"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontWeight:"bold",fontSize:"7pt"},children:"Next Term Begins:"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt"},colSpan:5,children:(t==null?void 0:t.next_term_begin)||(o==null?void 0:o.resumption_date)||""})]})]})})}),e.jsx("div",{style:{width:"25%"},children:e.jsx("div",{className:"border border-black",style:{height:"18mm",display:"flex",alignItems:"center",justifyContent:"center"},children:h!=null&&h.photo_url?e.jsx("img",{src:h.photo_url,alt:"Student Photo",style:{width:"100%",height:"100%",objectFit:"cover"}}):e.jsx("div",{style:{width:"100%",height:"100%",backgroundColor:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{fontSize:"9pt",color:"#666"},children:"No Photo"})})})})]}),e.jsx("div",{style:{textAlign:"center",marginBottom:"1mm",padding:"1mm 0"},children:e.jsxs("h2",{style:{fontSize:"13pt",fontWeight:"bold",textDecoration:"underline",margin:"0.5mm 0",textTransform:"uppercase",color:"#2c3e50",letterSpacing:"2px",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:[t.term||"THIRD TERM"," RESULT SHEET"]})}),e.jsx("div",{style:{display:"flex",justifyContent:"center",marginBottom:"1mm"},children:e.jsxs("table",{className:"print-table",style:{fontSize:"7pt",width:"95%",borderCollapse:"collapse",border:"2px solid #2c3e50",backgroundColor:"white",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid",pageBreakAfter:"auto",textRendering:"geometricPrecision",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{backgroundColor:"#2c3e50",color:"white"},children:[e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"3%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"SN"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"16%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"SUBJECT"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"1st CA"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"2nd CA"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Exams"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"6%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Total"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"5%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Grd"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",width:"8%",fontWeight:"bold",fontSize:"7pt",backgroundColor:"#2c3e50",color:"white"},children:"Remark"})]})}),e.jsx("tbody",{children:$&&$.length>0?$.map((r,a)=>{const n=xe(r.total||0);return e.jsxs("tr",{children:[e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:a+1}),e.jsx("td",{className:"border border-black",style:{padding:"0.4mm",fontSize:"7pt"},children:r.subject_name||"Subject"}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:r.ca1||0}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:r.ca2||0}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"7pt"},children:r.exam||0}),e.jsx("td",{className:"border border-black text-center font-bold",style:{padding:"0.4mm",textAlign:"center",fontWeight:"bold",fontSize:"7pt"},children:r.total||0}),e.jsx("td",{className:"border border-black text-center font-bold",style:{padding:"0.4mm",textAlign:"center",fontWeight:"bold",fontSize:"7pt"},children:n.grade}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.4mm",textAlign:"center",fontSize:"4pt"},children:n.remark})]},a)}):e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"border border-black p-2 text-center text-gray-500",style:{padding:"1.5mm",fontSize:"7pt"},children:"No scores available"})})})]})}),e.jsx("div",{style:{display:"flex",justifyContent:"center",marginBottom:"1mm"},children:e.jsx("table",{className:"print-table",style:{marginTop:"0.8mm",fontSize:"6pt",width:"95%",borderCollapse:"collapse",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid"},children:e.jsx("tbody",{children:e.jsxs("tr",{children:[e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"TOTAL:"})," ",t.total_score||"0.00"]}),e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"AVG:"})," ",t.average_score||"0.00"]}),e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"CLASS AVG:"})," ",t.class_average||"0.00"]}),!((J=i==null?void 0:i.name)!=null&&J.toUpperCase().includes("CRECHE"))&&!((Q=i==null?void 0:i.name)!=null&&Q.toUpperCase().includes("KG1"))&&!((D=i==null?void 0:i.name)!=null&&D.toUpperCase().includes("KG2"))&&!((Z=i==null?void 0:i.name)!=null&&Z.toUpperCase().includes("KG 1"))&&!((ee=i==null?void 0:i.name)!=null&&ee.toUpperCase().includes("KG 2"))&&!((te=i==null?void 0:i.name)!=null&&te.toUpperCase().includes("KINDERGARTEN"))&&e.jsxs("td",{className:"border border-black p-1",style:{padding:"0.8mm",width:"25%",fontSize:"7pt"},children:[e.jsx("b",{children:"POS:"})," ",t.position?`${t.position}${t.position===1?"st":t.position===2?"nd":t.position===3?"rd":"th"}`:"___"]})]})})})}),e.jsxs("div",{style:{display:"flex",justifyContent:"center",marginTop:"2mm",marginBottom:"1.5mm",gap:"2mm"},children:[e.jsxs("div",{className:"border border-black p-1",style:{padding:"2mm",fontSize:"6pt",width:"47%",minHeight:"25mm",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid",overflow:"visible"},children:[e.jsx("p",{style:{margin:"0.3mm 0",fontSize:"7pt",fontWeight:"bold",color:"#2c3e50"},children:"CLASS TEACHER"}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt"},children:[e.jsx("b",{children:"Name:"})," ",fe()]}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt",whiteSpace:"pre-wrap",wordWrap:"break-word",maxWidth:"100%",overflow:"visible",lineHeight:"1.2"},children:[e.jsx("b",{children:"Comment:"})," ",(t==null?void 0:t.class_teacher_comment)||(t==null?void 0:t.comment)||"Teacher comment will appear here."]})]}),e.jsxs("div",{className:"border border-black p-1",style:{padding:"2mm",fontSize:"6pt",width:"47%",minHeight:"30mm",border:"2px solid #2c3e50",backgroundColor:"#f8f9fa",boxShadow:"0 2px 4px rgba(0,0,0,0.1)",pageBreakInside:"avoid",overflow:"visible"},children:[e.jsx("p",{style:{margin:"0.3mm 0",fontSize:"7pt",fontWeight:"bold",color:"#2c3e50"},children:(i==null?void 0:i.category)==="Primary"?"HEAD TEACHER":"PRINCIPAL"}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt"},children:[e.jsx("b",{children:"Name:"}),(i==null?void 0:i.category)==="Primary"?` ${(o==null?void 0:o.head_teacher_name)||"_________________"}`:` ${(o==null?void 0:o.principal_name)||"_________________"}`]}),e.jsxs("p",{style:{margin:"0.3mm 0",fontSize:"7pt",whiteSpace:"pre-wrap",wordWrap:"break-word",maxWidth:"100%",overflow:"visible",lineHeight:"1.2"},children:[e.jsx("b",{children:"Comment:"})," ",(i==null?void 0:i.category)==="Primary"?(t==null?void 0:t.principal_comment)||(o==null?void 0:o.head_teacher_comment)||"Head teacher comment will appear here.":(t==null?void 0:t.principal_comment)||(o==null?void 0:o.principal_comment)||"Principal comment will appear here."]}),e.jsx("div",{style:{marginTop:"1mm",marginBottom:"0.5mm",fontSize:"7pt"},children:e.jsx("b",{children:"Signature:"})}),e.jsx("div",{style:{borderBottom:"1px solid black",height:"8mm",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"},children:(i==null?void 0:i.category)==="Primary"?o!=null&&o.head_teacher_signature?e.jsx("img",{src:o.head_teacher_signature,alt:"Head Teacher Signature",style:{maxWidth:"100%",maxHeight:"6mm",objectFit:"contain"}}):e.jsx("span",{style:{color:"#999",fontSize:"4pt"}}):o!=null&&o.principal_signature?e.jsx("img",{src:o.principal_signature,alt:"Principal Signature",style:{maxWidth:"100%",maxHeight:"6mm",objectFit:"contain"}}):e.jsx("span",{style:{color:"#999",fontSize:"4pt"}})})]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"center",gap:"2mm",marginBottom:"1mm",alignItems:"flex-start"},children:[e.jsxs("div",{style:{width:"48%"},children:[e.jsx("div",{className:"text-center mb-1",children:e.jsx("h3",{className:"font-bold underline",style:{fontSize:"10pt",marginBottom:"0.5mm",color:"#2c3e50",letterSpacing:"1px"},children:"AFFECTIVE"})}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",border:"1px solid black",fontSize:"6pt",boxShadow:"0 1px 2px rgba(0,0,0,0.1)",pageBreakInside:"avoid",tableLayout:"fixed"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{backgroundColor:"#1a252f",color:"white"},children:[e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"50%"},children:"QUALITY"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"20%"},children:"SCORE"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"30%"},children:"REMARK"})]})}),e.jsx("tbody",{children:(()=>{var a,n,c,f,j,g,b,k,S,d;const r=me();return e.jsxs(e.Fragment,{children:[e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("attentiveness")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.attentiveness||((a=t.affective)==null?void 0:a.attentiveness)||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.attentiveness||((n=t.affective)==null?void 0:n.attentiveness)||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("honesty")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.honesty||((c=t.affective)==null?void 0:c.honesty)||"3"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.honesty||((f=t.affective)==null?void 0:f.honesty)||3))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("neatness")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.neatness||((j=t.affective)==null?void 0:j.neatness)||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.neatness||((g=t.affective)==null?void 0:g.neatness)||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("obedience")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.obedience||((b=t.affective)==null?void 0:b.obedience)||"2"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.obedience||((k=t.affective)==null?void 0:k.obedience)||2))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("sense_of_responsibility")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.sense_of_responsibility||((S=t.affective)==null?void 0:S.sense_of_responsibility)||"3"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.sense_of_responsibility||((d=t.affective)==null?void 0:d.sense_of_responsibility)||3))})]})]})})()})]})]}),e.jsxs("div",{style:{width:"48%"},children:[e.jsx("div",{className:"text-center mb-1",children:e.jsx("h3",{className:"font-bold underline",style:{fontSize:"10pt",marginBottom:"0.5mm",color:"#2c3e50",letterSpacing:"1px"},children:"PSYCHOMOTOR"})}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",border:"1px solid black",fontSize:"7pt",boxShadow:"0 1px 2px rgba(0,0,0,0.1)",pageBreakInside:"avoid",tableLayout:"fixed"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{backgroundColor:"#1a252f",color:"white"},children:[e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"50%"},children:"SKILL"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"20%"},children:"SCORE"}),e.jsx("th",{className:"border border-black",style:{padding:"0.6mm",fontSize:"6pt",backgroundColor:"#1a252f",color:"white",fontWeight:"bold",width:"30%"},children:"REMARK"})]})}),e.jsx("tbody",{children:(()=>{var a,n,c,f,j,g,b,k,S,d,s,w;const r=pe();return e.jsxs(e.Fragment,{children:[e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("attention_to_direction")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.attention_to_direction||((a=t.psychomotor)==null?void 0:a.attention_to_direction)||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.attention_to_direction||((n=t.psychomotor)==null?void 0:n.attention_to_direction)||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("considerate_of_others")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.considerate_of_others||((c=t.psychomotor)==null?void 0:c.considerate_of_others)||"2"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.considerate_of_others||((f=t.psychomotor)==null?void 0:f.considerate_of_others)||2))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("handwriting")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.handwriting||((j=t.psychomotor)==null?void 0:j.handwriting)||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.handwriting||((g=t.psychomotor)==null?void 0:g.handwriting)||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("sports")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.sports||((b=t.psychomotor)==null?void 0:b.sports)||"3"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.sports||((k=t.psychomotor)==null?void 0:k.sports)||3))})]}),e.jsxs("tr",{style:{backgroundColor:"#f8f9fa"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("verbal_fluency")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.verbal_fluency||((S=t.psychomotor)==null?void 0:S.verbal_fluency)||"4"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.verbal_fluency||((d=t.psychomotor)==null?void 0:d.verbal_fluency)||4))})]}),e.jsxs("tr",{style:{backgroundColor:"white"},children:[e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"600",color:"#000000",textRendering:"geometricPrecision"},children:y("works_well_independently")}),e.jsx("td",{className:"border border-black text-center",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"bold",color:"#000000",textRendering:"geometricPrecision"},children:r.works_well_independently||((s=t.psychomotor)==null?void 0:s.independent_work)||"5"}),e.jsx("td",{className:"border border-black",style:{padding:"0.5mm",fontSize:"7pt",fontWeight:"500",color:"#000000",textRendering:"geometricPrecision"},children:x(parseInt(r.works_well_independently||((w=t.psychomotor)==null?void 0:w.independent_work)||5))})]})]})})()})]})]})]})]})}),v&&e.jsxs("div",{className:"no-print",style:{textAlign:"center",marginTop:"20px",marginBottom:"20px",padding:"10px"},children:[e.jsx(I,{onClick:ce,className:"bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded",style:{marginRight:"8px"},children:"Print Result (Ctrl+P)"}),u&&e.jsx(I,{onClick:()=>u(t.id),className:"bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded",children:"Download PDF"})]})]})}function Ie({studentId:m,resultId:l,onClose:t}){const{students:_,classes:v,compiledResults:u}=oe(),[W,C]=N.useState(null),[p,o]=N.useState(null),[P,B]=N.useState(null);N.useEffect(()=>{const z=Array.isArray(_)?_:[],F=Array.isArray(u)?u:[],T=Array.isArray(v)?v:[],E=z.find(R=>R.id===m),A=F.find(R=>R.id===l),G=T.find(R=>R.id===(A==null?void 0:A.class_id));C(E),o(A),B(G)},[m,l,_,u,v]);const M=()=>{window.print()},H=()=>{const z=document.querySelector("[data-download-pdf]");z&&z.click()};return!W||!p?e.jsx("div",{className:"min-h-screen bg-gray-100 flex items-center justify-center",children:e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"}),e.jsx("p",{className:"text-gray-600",children:"Loading result..."})]})}):e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"min-h-screen bg-gray-100",children:[e.jsx("div",{className:"no-print bg-white shadow-md border-b border-gray-200 sticky top-0 z-50",children:e.jsx("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",children:e.jsxs("div",{className:"flex justify-between items-center py-4",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs(I,{variant:"outline",onClick:t,className:"flex items-center gap-2",children:[e.jsx(ve,{className:"w-4 h-4"}),"Back to Results"]}),e.jsxs("div",{children:[e.jsxs("h1",{className:"text-xl font-semibold text-gray-900",children:[W.firstName," ",W.lastName," - Result Sheet"]}),e.jsxs("p",{className:"text-sm text-gray-600",children:[P==null?void 0:P.name," • ",p.term," • ",p.academic_year]})]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs(I,{variant:"outline",onClick:M,className:"flex items-center gap-2",children:[e.jsx(ue,{className:"w-4 h-4"}),"Print"]}),e.jsxs(I,{variant:"outline",onClick:H,className:"flex items-center gap-2","data-download-pdf":!0,children:[e.jsx(ze,{className:"w-4 h-4"}),"Download PDF"]})]})]})})}),e.jsx("div",{className:"full-page-container py-8",children:e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsx("div",{className:"bg-white shadow-2xl mx-auto overflow-auto",style:{width:"210mm",minHeight:"297mm",maxWidth:"100%",aspectRatio:"210/297",overflow:"visible"},children:e.jsx("div",{className:"transform-gpu",style:{transform:"scale(1)",transformOrigin:"top center",width:"100%",height:"100%",overflow:"visible"},children:e.jsx(We,{student:W,studentClass:P,result:p,showActions:!1,currentUser:{role:"admin"}})})}),e.jsxs("div",{className:"no-print mt-8 text-center text-gray-600",children:[e.jsx("p",{className:"text-sm",children:"This is displayed in A4 format. Use the Print button to print or Download PDF to save."}),e.jsx("p",{className:"text-xs mt-2",children:"The result sheet is optimized for A4 paper size (210mm × 297mm)."})]})]})})]})]})}export{Ie as F,We as S};
