/**
 * Every outbound URL on the site lives here.
 *
 * A value of `null` is not a bug — it renders as a disabled control with
 * honest copy instead of a dead "#" href. Fill one in and the link goes
 * live everywhere it appears. Nothing else needs touching.
 */
export const LINKS = {
  site: 'https://aladdincode.netlify.app',
  github: 'https://github.com/Aladdin-Codes',
  linkedin: 'https://www.linkedin.com/in/nurudeensalihu',
  resume: '/Nurudeen-Salihu-Resume.pdf',
  email: 'Nurudeen.dev@gmail.com',
  phone: '+2347065020706',
  emailHref: 'mailto:Nurudeen.dev@gmail.com',
  phoneHref: 'tel:+2347065020706',
  top: '#top',
  about: '/about',
  work: '/#work',
  practice: '#practice',
  stack: '#stack',
  journey: '#journey',
  contact: '/#contact',

  jdmarcLive: null as string | null,   // internal system — a recorded walkthrough works here
  jdmarcRepo: null as string | null,   // client-owned code: leave null rather than fake it
  microRepo: null as string | null,    // TODO
  microNotes: null as string | null,   // TODO — a good README counts
  driveLive: null as string | null,    // TODO
  driveRepo: null as string | null,    // TODO
  filesRepo: null as string | null,    // TODO
  animRepo: null as string | null,     // TODO
};
