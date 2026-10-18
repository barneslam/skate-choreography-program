// Beta authentication override: email + password. Mobile is profile data only.
(function(){
  const emailValue = sel => (document.querySelector(sel)?.value || '').trim().toLowerCase();
  const mobileValue = () => {
    const cc = document.querySelector('#signupCountryCode')?.value || '+1';
    const digits = (document.querySelector('#signupPhone')?.value || '').replace(/\D/g,'');
    return cc + digits;
  };
  const setStatus = (msg, error=false) => status(msg,error);

  document.querySelector('#authIntro').textContent='Use your email address and password. Your mobile number is stored in your profile; no text message is required during beta testing.';

  document.querySelector('#showSignup').onclick=()=>{
    showAuth('#signupStep');
    document.querySelector('#authTitle').textContent='Create account';
    setStatus('Create your beta account with email, password and mobile number.');
  };
  document.querySelector('#showReset').onclick=()=>{
    showAuth('#resetStep');
    document.querySelector('#authTitle').textContent='Reset password';
    setStatus('Enter the email address you use to sign in.');
  };
  const back=()=>{
    showAuth('#loginStep');
    document.querySelector('#authTitle').textContent='Sign in';
    setStatus('Email + password beta login is ready.');
  };
  document.querySelector('#backToLogin1').onclick=back;
  document.querySelector('#backToLogin2').onclick=back;

  document.querySelector('#signInBtn').onclick=async()=>{
    const email=emailValue('#phoneNumber');
    const password=document.querySelector('#password').value;
    if(!email.includes('@') || !password){setStatus('Enter your email address and password.',true);return;}
    setStatus('Signing in...');
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error){setStatus(error.message,true);return;}
    await routeSession();
  };

  document.querySelector('#createAccountBtn').onclick=async()=>{
    const email=emailValue('#signupEmail');
    const password=document.querySelector('#signupPassword').value;
    const mobile=mobileValue();
    if(!email.includes('@') || !validPassword(password) || mobile.replace(/\D/g,'').length<10){
      setStatus('Enter a valid email, password of at least 8 characters, and mobile number.',true);return;
    }
    setStatus('Creating account...');
    const {data,error}=await sb.auth.signUp({
      email,password,
      options:{data:{mobile_phone:mobile}}
    });
    if(error){setStatus(error.message,true);return;}
    document.querySelector('#profileEmail').value=email;
    document.querySelector('#profilePhone').value=mobile;
    if(!data.session){
      showAuth('#loginStep');
      document.querySelector('#authTitle').textContent='Check your email';
      document.querySelector('#phoneNumber').value=email;
      setStatus('Account created. Confirm your email from the message Supabase sent, then return here and sign in.');
      return;
    }
    await routeSession();
    if(!currentProfile && document.querySelector('#profilePhone')) document.querySelector('#profilePhone').value=mobile;
  };

  document.querySelector('#finishOnboarding').onclick=async()=>{
    const name=document.querySelector('#fullName').value.trim();
    const email=emailValue('#profileEmail');
    let mobile=(document.querySelector('#profilePhone').value || '').trim();
    if(!mobile.startsWith('+')) mobile='+1'+mobile.replace(/\D/g,'');
    if(!name || !selectedRole || !email.includes('@') || mobile.replace(/\D/g,'').length<10){
      setStatus('Enter your name and mobile number, then choose Student / Skater, Coach, or Parent / Guardian.',true);return;
    }
    const {error}=await sb.rpc('complete_onboarding_email_beta',{
      p_role:selectedRole,
      p_full_name:name,
      p_phone:mobile,
      p_email:email
    });
    if(error){setStatus(error.message,true);return;}
    await loadProfile();
  };

  // Populate onboarding fields for users who confirmed email before returning.
  sb.auth.getUser().then(({data:{user}})=>{
    if(!user) return;
    if(document.querySelector('#profileEmail')) document.querySelector('#profileEmail').value=user.email || '';
    if(document.querySelector('#profilePhone') && !document.querySelector('#profilePhone').value){
      document.querySelector('#profilePhone').value=user.user_metadata?.mobile_phone || '';
    }
  });
})();
