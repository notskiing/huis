import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Building2, CalendarClock, Check, CheckCircle2, ChevronDown,
  Clock3, FileText, Headphones, Inbox, LayoutDashboard, Mail, Menu, MessageSquareText,
  Phone, Plus, RefreshCw, Search, ShieldCheck, Sparkles, UsersRound, Wrench, X,
} from "lucide-react";

type Approval = { id: string; kind: "VENDOR_OUTREACH" | "BOOKING"; status: string; scope: Record<string, any>; expiresAt: string };
type Quote = { id: string; vendorName: string; amountMinCents: number; amountMaxCents: number; availabilityWindows: Array<{start:string;end:string}>; scopeSummary:string; confidence:number; humanVerified:boolean };
type Audit = { id:string; eventName:string; actorType:string; payload:Record<string,any>; createdAt:string };
type RequestItem = {
  id:string; source:string; category:string; severity:"ROUTINE"|"URGENT"|"CRITICAL"; summary:string; status:string;
  ruleFlags:string[]; createdAt:string; updatedAt:string; version:number; approvals:Approval[]; quotes:Quote[];
  interactions:Array<{id:string;channel:string;direction:string;provider:string;summary:string;occurredAt:string}>;
  audit:Audit[]; appointment:{startAt:string;endAt:string;status:string}|null;
};
type Property = { id:string; name:string; timezone:string; unitCount:number; open:number; urgent:number; latestEventAt:string|null };
type TimelineEvent = { id:string; eventName:string; requestId:string; category:string; createdAt:string; deliveryStatus:string };
type AgentPlan = { source:"deterministic"|"openai"; model:string|null; status:"disabled"|"ready"|"fallback"; agents:string[]; explanation:string; guardrails:string[] };
type Dashboard = {
  property:{id:string;name:string;unit:string;timezone:string}; requests:RequestItem[]; vendors:Array<any>; timeline:TimelineEvent[];
  metrics:{open:number;approvalsDue:number;urgent:number;medianResolutionHours:number};
  integrations:{dial:string;keewano:string;sparta:string}; intakeEmail:string;
  propertyStatus:{statusKey:string;statusLabel:string;openRequests:number;urgentRequests:number;approvalsDue:number;updatedAt:string;source:string}|null;
};

const statusLabels: Record<string,string> = {
  INTAKE:"Intake", HUMAN_REVIEW:"Human review", AWAITING_OUTREACH_APPROVAL:"Needs outreach approval",
  SOURCING:"Contacting vendor", AWAITING_BOOKING_APPROVAL:"Needs booking approval", SCHEDULED:"Scheduled",
  RESOLVED:"Resolved", CANCELLED:"Cancelled", RECONCILIATION_REQUIRED:"Needs reconciliation",
};

const eventLabels: Record<string,string> = {
  REQUEST_CREATED:"Request received", URGENCY_CLASSIFIED:"Safety triage complete", OUTREACH_APPROVAL_REQUESTED:"Outreach approval requested",
  OUTREACH_APPROVED:"Vendor outreach approved", VENDOR_OUTREACH_STARTED:"Vendor call completed", QUOTE_CAPTURED:"Draft quote captured",
  BOOKING_APPROVAL_REQUESTED:"Booking approval requested", BOOKING_APPROVED:"Booking approved", APPOINTMENT_CONFIRMED:"Appointment confirmed",
  HUMAN_ESCALATION_REQUIRED:"Emergency escalation required",
};

const fmtMoney = (cents:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(cents/100);
const fmtDate = (value:string) => new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));
const fmtTime = (value:string) => new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date(value));
const timeAgo = (value:string) => {
  const mins = Math.max(1, Math.round((Date.now()-Date.parse(value))/60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins/60)}h ago`;
  return `${Math.round(mins/1440)}d ago`;
};

function Brand(){ return <div className="brand"><div className="brand-mark"><span>H</span></div><div><div className="brand-name">Huis</div><div className="brand-tag">Property work, sorted.</div></div></div> }

function Sidebar({section,setSection,open,setOpen}:{section:string;setSection:(s:string)=>void;open:boolean;setOpen:(v:boolean)=>void}){
  const nav = [
    ["Overview",LayoutDashboard],["Requests",Inbox],["Vendors",UsersRound],["Activity",Activity],
  ] as const;
  return <aside className={`sidebar ${open?"sidebar-open":""}`}>
    <div className="sidebar-top"><Brand/><button className="icon-button mobile-only" onClick={()=>setOpen(false)} aria-label="Close menu"><X/></button></div>
    <nav>{nav.map(([label,Icon])=><button key={label} className={section===label?"active":""} onClick={()=>{setSection(label);setOpen(false)}}><Icon size={18}/><span>{label}</span>{label==="Requests"&&<b>1</b>}</button>)}</nav>
    <div className="channel-card">
      <div className="channel-title"><Headphones size={16}/><span>How tenants reach you</span></div>
      <div className="channel-row"><Phone size={14}/> Voice & SMS</div>
      <div className="channel-row"><Mail size={14}/> Email + files</div>
      <p>No portal or app needed.</p>
    </div>
    <div className="sidebar-bottom">
      <div className="avatar">MC</div><div><strong>Maya Chen</strong><span>Landlord · Owner</span></div><ChevronDown size={15}/>
    </div>
  </aside>
}

function IntegrationPill({name,status}:{name:string;status:string}){
  const live=status==="live"||status==="configured";
  const sim=status==="simulation"||status==="demo";
  return <div className="integration-pill"><span className={`status-dot ${live?"live":sim?"sim":"off"}`}/><span>{name}</span><em>{sim?"Demo":status}</em></div>
}

function StatCard({icon:Icon,label,value,detail,tone}:{icon:any;label:string;value:string|number;detail:string;tone:string}){
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}

function SeverityBadge({severity}:{severity:string}){return <span className={`severity ${severity.toLowerCase()}`}><span/>{severity[0]+severity.slice(1).toLowerCase()}</span>}
function ChannelIcon({source}:{source:string}){return source==="SMS"?<MessageSquareText size={16}/>:source==="VOICE"?<Phone size={16}/>:<Mail size={16}/>}

function Progress({status}:{status:string}){
  const stages=["Intake","Outreach","Quote","Approval","Scheduled"];
  const index:Record<string,number>={INTAKE:0,AWAITING_OUTREACH_APPROVAL:1,SOURCING:2,AWAITING_BOOKING_APPROVAL:3,SCHEDULED:4,RESOLVED:4,HUMAN_REVIEW:0};
  const active=index[status]??0;
  return <div className="progress-wrap"><div className="progress-line"/><div className="progress-fill" style={{width:`${active*25}%`}}/>{stages.map((stage,i)=><div className={`progress-step ${i<=active?"done":""}`} key={stage}><span>{i<active?<Check size={12}/>:i+1}</span><em>{stage}</em></div>)}</div>
}

function PropertyPicker({properties,onChoose}:{properties:Property[];onChoose:(id:string)=>void}){
  return <main className="property-picker"><div className="picker-inner"><Brand/><div className="picker-kicker">HUIS · LANDLORD WORKSPACE</div><h1>Which house are you looking at?</h1><p className="picker-lede">Choose a property to see its requests, calls, documents, and Keewano timeline.</p><div className="property-grid">{properties.map((property)=><button className="property-card" key={property.id} onClick={()=>onChoose(property.id)}><div className="property-card-top"><span className="property-symbol"><Building2/></span><ArrowRight/></div><h2>{property.name}</h2><p>{property.unitCount} unit{property.unitCount===1?"":"s"} · {property.open} open request{property.open===1?"":"s"}</p><div className="property-card-foot"><span>{property.urgent ? `${property.urgent} urgent` : "No urgent issues"}</span><em>{property.latestEventAt ? timeAgo(property.latestEventAt) : "No activity yet"}</em></div></button>)}</div><p className="picker-note">You can change properties from the name at the top of the inbox.</p></div></main>
}

function RequestCard({item,onSelect,selected,property}:{item:RequestItem;onSelect:()=>void;selected:boolean;property:Dashboard["property"]}){
  const pending=item.approvals.find(a=>a.status==="PENDING");
  return <button className={`request-card ${selected?"selected":""}`} onClick={onSelect}>
    <div className="request-top"><div className="request-source"><ChannelIcon source={item.source}/><span>{item.source==="WEB"?"EMAIL":item.source}</span></div><SeverityBadge severity={item.severity}/></div>
    <h3>{item.category}</h3><p>{item.summary}</p>
    <div className="request-meta"><span><Building2 size={14}/>{property.name} · {property.unit}</span><span><Clock3 size={14}/>{timeAgo(item.createdAt)}</span></div>
    <div className="request-footer"><span className={`state state-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>{pending&&<span className="due"><CalendarClock size={14}/>Due in {Math.max(1,Math.round((Date.parse(pending.expiresAt)-Date.now())/3600000))}h</span>}<ArrowRight size={17}/></div>
  </button>
}

function ActionPanel({item,act,busy}:{item:RequestItem;act:(path:string,body?:any)=>void;busy:boolean}){
  const pendingOutreach=item.approvals.find(a=>a.kind==="VENDOR_OUTREACH"&&a.status==="PENDING");
  const pendingBooking=item.approvals.find(a=>a.kind==="BOOKING"&&a.status==="PENDING");
  const quote=item.quotes[0];
  const availability=quote?.availabilityWindows[0];
  if(item.status==="HUMAN_REVIEW") return <div className="urgent-panel"><div className="urgent-symbol"><AlertTriangle/></div><div><span>Needs your attention</span><h3>Stop and check this now</h3><p>Huis will not contact or book anyone for this report. Contact the tenant and the right emergency service or utility.</p><div className="rule-chips">{item.ruleFlags.map(flag=><em key={flag}>{flag.replaceAll("_"," ")}</em>)}</div></div></div>;
  if(pendingOutreach) return <div className="action-panel"><div className="eyebrow">Your decision</div><h3>Ask Bluebird Plumbing for a quote?</h3><p>Huis will ask for a price and a time. It will not book the job, spend money, or share access details.</p><div className="scope-row"><span><Check/>Approved vendor</span><span><Check/>Quote only</span><span><Check/>Expires in 4 hours</span></div><button className="primary" disabled={busy} onClick={()=>act(`/api/requests/${item.id}/approve-outreach`,{approvalId:pendingOutreach.id})}>{busy?<RefreshCw className="spin"/>:<Phone/>}Ask for a quote</button></div>;
  if(item.status==="SOURCING") return <div className="action-panel sourcing-panel"><div className="call-wave"><i/><i/><i/><i/><i/></div><div><div className="eyebrow">Call in progress · demo</div><h3>Bluebird Plumbing was called</h3><p>They were asked for a time and a price. No work was booked.</p></div><button className="secondary" disabled={busy} onClick={()=>act(`/api/requests/${item.id}/simulate-quote`)}>{busy?<RefreshCw className="spin"/>:<Sparkles/>}Show the quote</button></div>;
  if(pendingBooking&&quote&&availability&&typeof pendingBooking.scope.amountCeilingCents==="number") return <div className="action-panel booking-panel"><div className="eyebrow">Second approval · commitment gate</div><h3>Review and approve booking</h3><div className="quote-grid"><div><span>Vendor</span><strong>{quote.vendorName}</strong></div><div><span>Quoted range</span><strong>{fmtMoney(quote.amountMinCents)}–{fmtMoney(quote.amountMaxCents)}</strong></div><div><span>Available</span><strong>{fmtDate(availability.start)}</strong></div><div><span>Amount ceiling</span><strong>{fmtMoney(pendingBooking.scope.amountCeilingCents)}</strong></div></div><div className="quote-note"><FileText/><p><strong>Transcript-derived draft · {Math.round(quote.confidence*100)}% confidence</strong>{quote.scopeSummary}</p></div><button className="primary" disabled={busy} onClick={()=>act(`/api/requests/${item.id}/approve-booking`,{approvalId:pendingBooking.id})}>{busy?<RefreshCw className="spin"/>:<CheckCircle2/>}Approve vendor, cap & time</button></div>;
  if(item.status==="SCHEDULED"&&item.appointment) return <div className="success-panel"><div className="success-icon"><Check/></div><div><div className="eyebrow">Booked</div><h3>{fmtDate(item.appointment.startAt)}</h3><p>Bluebird Plumbing · tenant and landlord notified by text. No payment or entry code was shared.</p></div></div>;
  return null;
}

function RequestDetail({item,property,act,busy,onClose}:{item:RequestItem;property:Dashboard["property"];act:(p:string,b?:any)=>void;busy:boolean;onClose:()=>void}){
  const [plan,setPlan]=useState<AgentPlan|null>(null); const [planning,setPlanning]=useState(false);
  const askLuna=async()=>{setPlanning(true);try{const res=await fetch(`/api/requests/${item.id}/agent-plan`);if(!res.ok)throw new Error("Planner unavailable");setPlan(await res.json())}finally{setPlanning(false)}};
  return <section className="detail-panel">
    <div className="detail-head"><div><div className="request-id">REQUEST · {item.id.slice(-8).toUpperCase()}</div><h2>{item.category} request</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>
    <div className="detail-badges"><SeverityBadge severity={item.severity}/><span className="channel-badge"><ChannelIcon source={item.source}/>{item.source==="WEB"?"Email + 3 files":item.source}</span><span className="channel-badge"><Building2 size={15}/>{property.name} · {property.unit}</span></div>
    <Progress status={item.status}/>
    <ActionPanel item={item} act={act} busy={busy}/>
    <div className="agent-panel"><div><div className="eyebrow">Routing help</div><h3>Let Huis pick the right roles</h3><p>Ask Luna for a recommendation using redacted request details. The landlord still approves every real action.</p></div><button className="secondary" onClick={()=>void askLuna()} disabled={planning}>{planning?<RefreshCw className="spin"/>:<Sparkles/>}{planning?"Reviewing…":"Ask Luna"}</button>{plan&&<div className="agent-result"><strong>{plan.status==="ready"?"Luna’s recommendation":plan.status==="fallback"?"Safe fallback":"Rules-based recommendation"}</strong><span>{plan.agents.join(" · ")}</span><p>{plan.explanation}</p></div>}</div>
    <div className="detail-columns">
      <div><div className="section-title"><span>Tenant report</span><em>Jordan Lee</em></div><div className="report-box"><MessageSquareText/><p>{item.interactions[0]?.summary??item.summary}<span>{fmtDate(item.createdAt)} · {item.source==="WEB"?"Email":"via "+item.source}</span></p></div></div>
      <div><div className="section-title"><span>Recent activity</span><em>{item.audit.length} events</em></div><div className="mini-timeline">{item.audit.slice(0,4).map((event,i)=><div key={event.id}><span className={i===0?"current":""}>{i===0?<Check size={11}/>:null}</span><p><strong>{eventLabels[event.eventName]??event.eventName}</strong><em>{fmtTime(event.createdAt)} · {event.actorType.toLowerCase()}</em></p></div>)}</div></div>
    </div>
  </section>
}

function KeewanoStatusPanel({status}:{status:Dashboard["propertyStatus"]}){
  if(!status) return <div className="keewano-status-card keewano-empty"><div><span className="eyebrow">KEEWANO STATUS</span><strong>Waiting for the first update</strong><p>The hourly property snapshot will appear here once the timeline has a status.</p></div></div>;
  const delivered=status.source==="KEEWANO_DELIVERED";
  return <div className="keewano-status-card">
    <div className="keewano-status-main"><span className="eyebrow">KEEWANO STATUS</span><strong>{status.statusLabel}</strong><p>{delivered?"Current property snapshot from Keewano.":"Snapshot queued locally; it will be sent to Keewano when available."}</p></div>
    <div className="keewano-counts"><div><b>{status.openRequests}</b><span>Open</span></div><div><b>{status.urgentRequests}</b><span>Urgent</span></div><div><b>{status.approvalsDue}</b><span>Approvals</span></div></div>
    <div className="keewano-status-foot"><span className={`keewano-source ${delivered?"live":"queued"}`}><i/>{delivered?"Live snapshot":"Queued locally"}</span><span>Updated {timeAgo(status.updatedAt)}</span></div>
  </div>;
}

function EmptySection({section,data}:{section:string;data:Dashboard}){
  if(section==="Vendors") return <div className="page-section"><div className="page-title"><div><span>People you can call</span><h1>Approved vendors</h1><p>Only these contacts can be used without another approval.</p></div></div><div className="vendor-grid">{data.vendors.map(v=><div className="vendor-card" key={v.id}><div className="vendor-logo">{v.businessName.split(" ").map((w:string)=>w[0]).join("")}</div><div><span>{v.trade}</span><h3>{v.businessName}</h3><p>{v.serviceArea}</p></div><ShieldCheck className="verified"/><div className="vendor-tags"><em>Approved</em>{v.afterHours&&<em>After hours</em>}</div></div>)}</div></div>;
  return <div className="page-section"><div className="page-title"><div><span>What happened · {data.integrations.keewano==="live"?"KEEWANO":"LOCAL OUTBOX"}</span><h1>History</h1><p>Every request, decision, and call for {data.property.name} in time order.</p></div></div><div className="activity-table">{data.timeline.map(e=><div key={e.id}><span className="activity-icon"><Activity/></span><div><strong>{eventLabels[e.eventName]??e.eventName.replaceAll("_"," ")}</strong><p>{e.category} · {e.requestId.slice(-8)}</p></div><em>{fmtDate(e.createdAt)}</em><b>{e.deliveryStatus}</b></div>)}</div></div>;
}

export function App(){
  const [data,setData]=useState<Dashboard|null>(null); const [properties,setProperties]=useState<Property[]>([]); const [propertyId,setPropertyId]=useState<string|null>(null); const [selected,setSelected]=useState<string|null>(null);
  const [section,setSection]=useState("Overview"); const [inboxTab,setInboxTab]=useState<"Requests"|"Keewano">("Requests"); const [busy,setBusy]=useState(false); const [menu,setMenu]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{void (async()=>{try{const res=await fetch("/api/properties");if(!res.ok)throw new Error("API unavailable");const value=await res.json();setProperties(value.properties??[])}catch(e){setError(e instanceof Error?e.message:"Unable to load")}})()},[]);
  const load=async(id:string)=>{try{setError("");const res=await fetch(`/api/dashboard?propertyId=${encodeURIComponent(id)}`);if(!res.ok)throw new Error("Property unavailable");const value=await res.json();setData(value);setPropertyId(id);setSelected(value.requests[0]?.id??null)}catch(e){setError(e instanceof Error?e.message:"Unable to load")}};
  const act=async(path:string,body?:any)=>{setBusy(true);setError("");try{const res=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body??{})});const value=await res.json();if(!res.ok)throw new Error(value.message??"Action failed");if(propertyId){const refreshed=await fetch(`/api/dashboard?propertyId=${encodeURIComponent(propertyId)}`);setData(await refreshed.json())}else setData(value)}catch(e){setError(e instanceof Error?e.message:"Action failed")}finally{setBusy(false)}};
  const active=useMemo(()=>data?.requests.find(r=>r.id===selected)??data?.requests[0], [data,selected]);
  if(!propertyId&&!data){if(!properties.length)return <div className="loading"><div className="brand-mark"><span>H</span></div><RefreshCw className="spin"/><p>{error||"Loading Huis…"}</p></div>;return <PropertyPicker properties={properties} onChoose={(id)=>void load(id)}/>;}
  if(!data)return <div className="loading"><div className="brand-mark"><span>H</span></div><RefreshCw className="spin"/><p>{error||"Loading Huis…"}</p></div>;
  return <div className="app-shell">
    <Sidebar section={section} setSection={setSection} open={menu} setOpen={setMenu}/>
    <main>
      <header><button className="icon-button mobile-only" onClick={()=>setMenu(true)}><Menu/></button><button className="property-switcher" onClick={()=>{setData(null);setPropertyId(null);setSection("Overview")}}><Building2 size={14}/>{data.property.name}<ChevronDown size={13}/></button><div className="header-search"><Search/><span>Search requests or people</span><kbd>⌘ K</kbd></div><div className="header-status"><IntegrationPill name="Dial" status={data.integrations.dial}/><div className="header-divider"/><button className="icon-button"><MessageSquareText/></button><div className="avatar small">MC</div></div></header>
      {error&&<div className="toast"><AlertTriangle/>{error}<button onClick={()=>setError("")}><X/></button></div>}
      {(section==="Activity"||section==="Vendors")?<EmptySection section={section} data={data}/>:<div className="dashboard">
        <div className="welcome-row"><div><span className="overline">SUNDAY · {data.property.name.toUpperCase()}</span><h1>{section==="Requests"?"Maintenance requests":"Keep the house moving."}</h1><p>{section==="Requests"?"Review requests and make the calls that need you.":"One thing needs your attention. The rest can wait."}</p></div><div className="demo-actions"><button className="secondary compact" onClick={()=>act("/api/demo/intake",{scenario:"email",propertyId:data.property.id})}><Mail/>Demo email</button><button className="secondary compact danger-outline" onClick={()=>act("/api/demo/intake",{scenario:"critical",propertyId:data.property.id})}><AlertTriangle/>Safety test</button><button className="icon-button" title="Reset demo" onClick={()=>act("/api/demo/reset")}><RefreshCw className={busy?"spin":""}/></button></div></div>
        <div className="stats"><StatCard icon={Wrench} label="Open requests" value={data.metrics.open} detail={`Across ${data.property.name}`} tone="sage"/><StatCard icon={ShieldCheck} label="Your approvals" value={data.metrics.approvalsDue} detail="Waiting for a decision" tone="amber"/><StatCard icon={AlertTriangle} label="Urgent" value={data.metrics.urgent} detail={data.metrics.urgent?"Human response needed":"Nothing escalated"} tone="rose"/><StatCard icon={Clock3} label="Median resolution" value={`${data.metrics.medianResolutionHours}h`} detail="Demo workflow average" tone="blue"/></div>
        <div className="intake-strip"><div><div className="intake-icon"><Mail/></div><p><strong>Tenants can send photos and documents to</strong><span>{data.intakeEmail}</span></p></div><button onClick={()=>navigator.clipboard?.writeText(data.intakeEmail)}>Copy address</button></div>
        <div className="workspace-grid">
          <section className="queue"><div className="queue-head"><div><span>INBOX · {data.integrations.keewano==="live"?"KEEWANO TIMELINE":"LOCAL TIMELINE"}</span><h2>{data.propertyStatus?.statusLabel??"Waiting for first Keewano update"}</h2></div><button><Plus/>New request</button></div><div className="queue-tabs"><button className={inboxTab==="Requests"?"active":""} onClick={()=>setInboxTab("Requests")}>Active <b>{data.metrics.open}</b></button><button>Waiting</button><button>Closed</button><button className={`keewano-status-tab ${inboxTab==="Keewano"?"active":""}`} onClick={()=>setInboxTab("Keewano")}><span className="keewano-tab-mark">K</span>Keewano</button></div>{inboxTab==="Keewano"&&<KeewanoStatusPanel status={data.propertyStatus}/>}<div className="request-list">{data.requests.map(item=><RequestCard key={item.id} item={item} property={data.property} selected={active?.id===item.id} onSelect={()=>setSelected(item.id)}/>)}</div>{!data.requests.length&&<div className="empty-inbox"><strong>No requests yet.</strong><span>This property’s timeline is ready for its first tenant report.</span></div>}</section>
          {active&&<RequestDetail item={active} property={data.property} act={act} busy={busy} onClose={()=>setSelected(null)}/>}
        </div>
        <div className="trust-footer"><div><ShieldCheck/><p><strong>You make the decisions.</strong><span>Huis never books, spends, or shares access without your approval.</span></p></div><div className="system-pills"><IntegrationPill name="Keewano" status={data.integrations.keewano}/><IntegrationPill name="Sparta" status={data.integrations.sparta}/></div></div>
      </div>}
    </main>
  </div>
}
