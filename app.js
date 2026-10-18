const SUPABASE_URL='https://myjkjaracfsomtpwmizy.supabase.co';
const SUPABASE_KEY='sb_publishable_QA1HPPYsRpNgpulT3SFSPw_FJWlLZbn';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let selectedRole=null, currentProfile=null, currentStudent=null, currentCoach=null, currentParent=null, selectedStudent=null, musicFile=null;

function status(msg,error=false){const e=$('#authStatus');e.textContent=msg;e.classList.toggle('error',error)}
function toast(msg){const e=$('#toast');e.textContent=msg;e.style.display='block';setTimeout(()=>e.style.display='none',2300)}
function phone(ccSel, numberSel){const cc=$(ccSel).value;const digits=$(numberSel).value.replace(/\D/g,'');return cc+digits}
function showAuth(which){
  ['#loginStep','#signupStep','#resetStep','#newPasswordStep','#onboardingStep'].forEach(x=>$(x).classList.add('hidden'));
  $(which).classList.remove('hidden');
}
function validPassword(p){return p.length>=8}

$('#showSignup').onclick=()=>{showAuth('#signupStep');$('#authTitle').textContent='Create account';status('Create your beta account with phone, password and recovery email.')};
$('#showReset').onclick=()=>{showAuth('#resetStep');$('#authTitle').textContent='Reset password';status('Use the recovery email connected to your account.')};
$('#backToLogin1').onclick=$('#backToLogin2').onclick=()=>{showAuth('#loginStep');$('#authTitle').textContent='Sign in';status('Phone + password beta login is ready.')};

$('#signInBtn').onclick=async()=>{
  const p=phone('#countryCode','#phoneNumber'), password=$('#password').value;
  if(p.length<10||!password){status('Enter your mobile number and password.',true);return}
  status('Signing in...');
  const {error}=await sb.auth.signInWithPassword({phone:p,password});
  if(error){status(error.message,true);return}
  await routeSession();
};

$('#createAccountBtn').onclick=async()=>{
  const p=phone('#signupCountryCode','#signupPhone'), password=$('#signupPassword').value, email=$('#signupEmail').value.trim().toLowerCase();
  if(p.length<10||!validPassword(password)||!email.includes('@')){status('Enter a valid phone number, password of at least 8 characters, and recovery email.',true);return}
  status('Creating account...');
  const {data,error}=await sb.auth.signUp({phone:p,password,options:{data:{recovery_email:email}}});
  if(error){status(error.message,true);return}
  if(!data.session){status('Account created, but Supabase is requiring phone confirmation. Disable phone confirmation for the beta project, then sign in.',true);return}
  const {error:emailError}=await sb.auth.updateUser({email});
  if(emailError){status('Account created. Recovery email could not be attached yet: '+emailError.message,true)}
  $('#profileEmail').value=email;
  await routeSession();
};

$('#sendResetBtn').onclick=async()=>{
  const email=$('#resetEmail').value.trim().toLowerCase();
  if(!email.includes('@')){status('Enter a valid recovery email.',true);return}
  status('Sending reset email...');
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(error){status(error.message,true);return}
  status('Password reset email sent. Open the link in that email.');
};

$('#saveNewPasswordBtn').onclick=async()=>{
  const password=$('#newPassword').value;
  if(!validPassword(password)){status('Password must be at least 8 characters.',true);return}
  const {error}=await sb.auth.updateUser({password});
  if(error){status(error.message,true);return}
  status('Password updated. Loading your account...');
  await routeSession();
};

$$('.role-option').forEach(el=>el.onclick=()=>{selectedRole=el.dataset.role;$$('.role-option').forEach(x=>x.classList.toggle('selected',x===el));$('#finishOnboarding').disabled=false});
$('#finishOnboarding').onclick=async()=>{
  const name=$('#fullName').value.trim(), email=$('#profileEmail').value.trim().toLowerCase();
  if(!name||!selectedRole||!email.includes('@')){status('Enter your name, recovery email and choose Student, Coach, or Parent / Guardian.',true);return}
  const {data:{user}}=await sb.auth.getUser();
  if(user && (!user.email || user.email.toLowerCase()!==email)){const {error}=await sb.auth.updateUser({email});if(error){status('Profile cannot be completed until the recovery email is attached: '+error.message,true);return}}
  const {error}=await sb.rpc('complete_onboarding_with_recovery',{p_role:selectedRole,p_full_name:name,p_email:email});
  if(error){status(error.message,true);return}
  await loadProfile();
};

async function routeSession(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){return}
  if(location.hash.includes('type=recovery')){showAuth('#newPasswordStep');$('#authTitle').textContent='Choose new password';return}
  await loadProfile();
}
async function loadProfile(){
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return;
  const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(error){status(error.message,true);return}
  if(!data){
    $('#authShell').classList.remove('hidden');$('#appShell').classList.add('hidden');
    showAuth('#onboardingStep');$('#authTitle').textContent='Finish your profile';$('#profileEmail').value=user.email||user.user_metadata?.recovery_email||'';status('Choose Student / Skater, Coach, or Parent / Guardian.');
    return;
  }
  currentProfile=data;$('#authShell').classList.add('hidden');$('#appShell').classList.remove('hidden');$('#userBadge').textContent=data.full_name+' · '+data.role;
  await routeRole();
}
async function routeRole(){
  $('#coachDashboard').classList.add('hidden');$('#studentDashboard').classList.add('hidden');$('#parentDashboard').classList.add('hidden');$('#parentStudentWorkspace').classList.add('hidden');$('#coachStudentWorkspace').classList.add('hidden');$('#studio').classList.add('hidden');
  if(currentProfile.role==='student'){
    const {data}=await sb.from('students').select('*').eq('profile_id',currentProfile.id).single(); currentStudent=data; selectedStudent=data;
    $('#studentDashboard').classList.remove('hidden');$('#studentHeading').textContent=(data?.display_name||currentProfile.full_name)+' — skating workspace'; await loadStudentSummary(data.id);
  } else if(currentProfile.role==='coach'){
    const {data:c}=await sb.from('coaches').select('*').eq('profile_id',currentProfile.id).single();currentCoach=c;$('#coachDashboard').classList.remove('hidden');await loadCoachStudents();
  } else if(currentProfile.role==='parent'){
    const {data:p}=await sb.from('parents').select('*').eq('profile_id',currentProfile.id).single();currentParent=p;$('#parentDashboard').classList.remove('hidden');await loadParentStudents();
  }
}

async function loadParentStudents(){
  const {data,error}=await sb.from('parent_students').select('student_id,status,relationship_label,students(id,display_name,skating_level)').eq('parent_id',currentParent.id).eq('status','active');
  const box=$('#parentStudentList');
  if(error){box.innerHTML='<div class="empty">'+error.message+'</div>';return}
  if(!data?.length){box.innerHTML='<div class="empty">No skaters are linked yet. An administrator can link a student to this parent / guardian account in Supabase.</div>';return}
  box.innerHTML=data.map(r=>`<div class="student-card parent-student-card" data-id="${r.students.id}"><div><div class="student-name">${r.students.display_name}</div><div class="small muted">${r.students.skating_level||'Level not set'}${r.relationship_label?' · '+r.relationship_label:''}</div></div><button class="btn">View</button></div>`).join('');
  $$('.parent-student-card').forEach(el=>el.onclick=()=>openParentStudent(el.dataset.id,data.find(r=>r.students.id===el.dataset.id).students.display_name));
}
async function openParentStudent(id,name){
  selectedStudent={id,display_name:name};$('#parentDashboard').classList.add('hidden');$('#parentStudentWorkspace').classList.remove('hidden');$('#parentStudentHeading').textContent=name+' — family view';await loadParentSummary(id);
}
$('#changeParentStudentBtn').onclick=()=>{selectedStudent=null;$('#parentStudentWorkspace').classList.add('hidden');$('#parentDashboard').classList.remove('hidden')};

async function loadCoachStudents(){
  const {data,error}=await sb.from('coach_students').select('student_id,status,relationship_label,students(id,display_name,skating_level)').eq('coach_id',currentCoach.id).eq('status','active');
  const box=$('#studentList');
  if(error){box.innerHTML='<div class="empty">'+error.message+'</div>';return}
  if(!data?.length){box.innerHTML='<div class="empty">No students are assigned yet. An administrator can link students to this coach in Supabase.</div>';return}
  box.innerHTML=data.map(r=>`<div class="student-card" data-id="${r.students.id}"><div><div class="student-name">${r.students.display_name}</div><div class="small muted">${r.students.skating_level||'Level not set'}${r.relationship_label?' · '+r.relationship_label:''}</div></div><button class="btn">Open</button></div>`).join('');
  $$('.student-card').forEach(el=>el.onclick=()=>openCoachStudent(el.dataset.id,data.find(r=>r.students.id===el.dataset.id).students.display_name));
}
async function openCoachStudent(id,name){
  selectedStudent={id,display_name:name};$('#coachDashboard').classList.add('hidden');$('#coachStudentWorkspace').classList.remove('hidden');$('#coachStudentHeading').textContent=name;$('#studio').classList.remove('hidden');$('#studioStudentName').textContent=name;await loadCoachFeedback(id);
}
$('#changeStudentBtn').onclick=()=>{selectedStudent=null;$('#coachStudentWorkspace').classList.add('hidden');$('#studio').classList.add('hidden');$('#coachDashboard').classList.remove('hidden')};
$('#openStudioBtn').onclick=()=>{$('#studio').classList.remove('hidden');$('#studioStudentName').textContent=selectedStudent.display_name;$('#studio').scrollIntoView({behavior:'smooth'})};

async function loadStudentSummary(studentId){
  const [{count:p},{count:f},{count:s},{data:feedback}]=await Promise.all([
    sb.from('programs').select('*',{count:'exact',head:true}).eq('student_id',studentId),
    sb.from('coach_feedback').select('*',{count:'exact',head:true}).eq('student_id',studentId),
    sb.from('practice_sessions').select('*',{count:'exact',head:true}).eq('student_id',studentId),
    sb.from('coach_feedback').select('body,feedback_type,created_at,coaches(display_name)').eq('student_id',studentId).order('created_at',{ascending:false}).limit(20)
  ]);
  $('#programCount').textContent=p||0;$('#feedbackCount').textContent=f||0;$('#practiceCount').textContent=s||0;
  renderFeedback('#feedbackTimeline',feedback);
}
async function loadParentSummary(studentId){
  const [{count:p},{count:f},{count:s},{data:feedback}]=await Promise.all([
    sb.from('programs').select('*',{count:'exact',head:true}).eq('student_id',studentId),
    sb.from('coach_feedback').select('*',{count:'exact',head:true}).eq('student_id',studentId),
    sb.from('practice_sessions').select('*',{count:'exact',head:true}).eq('student_id',studentId),
    sb.from('coach_feedback').select('body,feedback_type,created_at,coaches(display_name)').eq('student_id',studentId).order('created_at',{ascending:false}).limit(20)
  ]);
  $('#parentProgramCount').textContent=p||0;$('#parentFeedbackCount').textContent=f||0;$('#parentPracticeCount').textContent=s||0;
  renderFeedback('#parentFeedbackTimeline',feedback);
}
async function loadCoachFeedback(studentId){const {data}=await sb.from('coach_feedback').select('body,feedback_type,created_at').eq('student_id',studentId).order('created_at',{ascending:false}).limit(20);renderFeedback('#coachFeedbackTimeline',data)}
function renderFeedback(sel,data){const box=$(sel);if(!data?.length){box.innerHTML='<div class="empty">No feedback yet.</div>';return}box.innerHTML=data.map(x=>`<div class="timeline-item"><strong>${x.coaches?.display_name||x.feedback_type||'Coach feedback'}</strong><div>${x.body||''}</div><div class="small muted" style="margin-top:4px">${new Date(x.created_at).toLocaleString()}</div></div>`).join('')}
$('#saveFeedbackBtn').onclick=async()=>{const body=$('#coachFeedbackText').value.trim();if(!body||!selectedStudent||!currentCoach)return;const {error}=await sb.from('coach_feedback').insert({student_id:selectedStudent.id,coach_id:currentCoach.id,feedback_type:'general',body});if(error){toast(error.message);return}$('#coachFeedbackText').value='';toast('Feedback saved.');await loadCoachFeedback(selectedStudent.id)};

$('#logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};

$('#chooseMusic').onclick=()=>$('#musicFile').click();
$('#musicFile').onchange=async e=>{
  const f=e.target.files[0]; if(!f||!selectedStudent)return; musicFile=f;$('#musicName').textContent=f.name;try{$('#music').src=URL.createObjectURL(f);$('#music').style.display='block'}catch(_){}
  const path=`${selectedStudent.id}/music/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const {error}=await sb.storage.from('student-files').upload(path,f,{upsert:false}); if(error){toast('File selected; storage upload failed: '+error.message);return}
  await sb.from('student_files').insert({student_id:selectedStudent.id,uploaded_by:currentProfile.id,file_type:'music',file_name:f.name,storage_path:path});
  toast('Music uploaded securely.');
  gate();
};
$('#direction').oninput=gate;
function gate(){ $('#generate').disabled=!(musicFile&&$('#direction').value.trim()) }
$('#generate').onclick=()=>{$('#designs').classList.remove('hidden');$('#designs').scrollIntoView({behavior:'smooth'})};

const programData={Entry:{title:'Reliable & clear',description:'Generous preparation, cleaner transitions and lower execution risk while satisfying the selected STAR requirements.',cls:'entry'},Intermediate:{title:'Competitive balance',description:'Stronger transitions and musical alignment with balanced technical and choreographic demand.',cls:'mid'},Advanced:{title:'Maximum potential',description:'More complex entries, exits, timing and rink utilization while remaining within the selected STAR requirements.',cls:'adv'}};
$('#programSelect').onchange=e=>{const v=e.target.value;$('#previewChoice').disabled=!v;const box=$('#programDetail');if(!v){box.classList.remove('show');return}const d=programData[v];$('#programTag').textContent=v;$('#programTag').className='tag '+d.cls;$('#programTitle').textContent=d.title;$('#programDescription').textContent=d.description;box.classList.add('show')};
function preview(){const v=$('#programSelect').value;if(v)toast(v+' program preview ready for coach review.')}
$('#previewChoice').onclick=preview;$('#previewDetail').onclick=preview;
$('#selectProgram').onclick=async()=>{
  const v=$('#programSelect').value;if(!v||!selectedStudent)return;
  const {data:p,error}=await sb.from('programs').insert({student_id:selectedStudent.id,title:`${v} Program`,star_level:$('#star').value,status:'draft',created_by:currentProfile.id}).select().single();
  if(error){toast(error.message);return}
  await sb.from('program_versions').insert({program_id:p.id,version_type:v.toLowerCase(),content:{direction:$('#direction').value},created_by:currentProfile.id});
  toast(v+' program saved.'); if(currentProfile.role==='coach'){openEditor(v)} else {await loadStudentSummary(selectedStudent.id)}
};

const elements=[{name:'Opening / Start',time:'0:00',entry:'Opening pose',exit:'Build into first phrase',x:8,y:80},{name:'Jump 1',time:'0:28',entry:'Controlled setup',exit:'Flowing landing edge',x:26,y:62},{name:'Spin',time:'0:51',entry:'Musical transition',exit:'Open into travel',x:46,y:45},{name:'Step Sequence',time:'1:13',entry:'Edge build',exit:'Accelerate',x:66,y:60},{name:'Jump 2',time:'1:38',entry:'Compact preparation',exit:'Checked landing',x:82,y:40},{name:'Final Pose',time:'2:05',entry:'Musical finish',exit:'Hold',x:92,y:18}];let active=0;
function openEditor(v){$('#workspace').style.display='grid';$('#rinkTitle').textContent=v+' Program · Coach Review';draw();$('#workspace').scrollIntoView({behavior:'smooth'})}
function draw(){const rink=$('#rink');rink.querySelectorAll('.el').forEach(n=>n.remove());elements.forEach((e,i)=>{const n=document.createElement('button');n.className='el';n.style.left=e.x+'%';n.style.top=e.y+'%';n.textContent=i+1;n.onclick=()=>pick(i);rink.appendChild(n)});$('#list').innerHTML=elements.map((e,i)=>`<div class="item ${i===active?'active':''}" data-i="${i}"><strong>${e.name}</strong><div class="small muted">${e.time} · ${e.entry}</div></div>`).join('');$$('.item').forEach(n=>n.onclick=()=>pick(+n.dataset.i));pick(active)}
function pick(i){active=i;const e=elements[i];$('#elName').value=e.name;$('#elTime').value=e.time;$('#entry').value=e.entry;$('#exit').value=e.exit;$$('.item').forEach((n,j)=>n.classList.toggle('active',j===i))}
$('#apply').onclick=()=>{const e=elements[active];e.name=$('#elName').value;e.time=$('#elTime').value;e.entry=$('#entry').value;e.exit=$('#exit').value;draw();toast('Element updated.')};
$('#finalize').onclick=()=>toast('Program finalized for requirements check and binder workflow.');

sb.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){showAuth('#newPasswordStep');$('#authTitle').textContent='Choose new password'}else if(event==='SIGNED_IN'&&session){setTimeout(routeSession,0)}});
routeSession();
