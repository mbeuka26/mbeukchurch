import { S, persist, remove } from '../core/state.js';
import { BADGE, BTN, ES, G, TW, closeModal, esc, fmt, gv, lg, notify, openModal, setA, td, uid } from '../core/utils.js';

export function pgUtilisateurs(c){
  setA(BTN('bg','openAddUser()','+ Ajouter utilisateur'));
  var users=S.data.users,logs=S.data.logs.slice().sort(function(a,b){return b.ts-a.ts;}).slice(0,30);var rM={admin:'bdr',pasteur:'bod',tresorier:'btl',secretaire:'bbl',membre:'bgy'};
  var rows=users.length?users.map(function(u){return '<tr><td><strong>'+esc(u.nom)+'</strong></td><td>'+esc(u.email||'-')+'</td><td>'+BADGE(rM[u.role]||'bgy',u.role)+'</td><td>'+fmt(u.createdAt)+'</td><td style="white-space:nowrap"><button class="ai" onclick="openEditUser(\''+u.id+'\')">&#9999;</button><button class="ai" onclick="openEditUserRole(\''+u.id+'\')">&#128737;</button><button class="ai" onclick="delUser(\''+u.id+'\')">&#128465;</button></td></tr>';}).join(''):'';
  var logRows=logs.map(function(l){return '<div class="li"><div class="lt">'+new Date(l.ts).toLocaleString('fr')+'</div><div><span class="lu">'+esc(l.user)+'</span> - '+esc(l.action)+(l.detail?' ('+esc(l.detail)+')':'')+'</div></div>';}).join('');
  c.innerHTML='<div class="cd"><div class="ch"><span class="ct2">Utilisateurs ('+users.length+')</span></div>'+(users.length?TW('<tr><th>Nom</th><th>Email</th><th>Role</th><th>Cree le</th><th></th></tr>',rows):ES('&#128100;','Aucun utilisateur'))+'</div><div class="cd"><div class="ch"><span class="ct2">Journal activite</span></div>'+(logs.length?logRows:'<div style="color:var(--g3);font-size:.84rem;padding:14px">Aucune activite</div>')+'</div>';
}

export function openAddUser(){openModal('<div class="mtt">Nouvel Utilisateur</div><div class="fg"><div class="fi"><label>Nom *</label><input id="usn"></div><div class="fi"><label>Prenom</label><input id="usp2"></div><div class="fi"><label>Email</label><input id="use" type="email"></div><div class="fi"><label>Telephone</label><input id="ust"></div><div class="fi"><label>Role</label><select id="usr"><option value="membre">Membre</option><option value="secretaire">Secretaire</option><option value="tresorier">Tresorier</option><option value="pasteur">Pasteur</option><option value="admin">Admin</option></select></div><div class="fi"><label>Mot de passe</label><input id="uspwd" type="password"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveUser()','Creer')+'</div>');}
export async function saveUser(){var nom=gv('usn');if(!nom){notify('Nom requis','error');return;}await persist('users',{id:uid(),nom:nom,prenom:gv('usp2'),email:gv('use'),telephone:gv('ust'),role:gv('usr'),createdAt:Date.now()});lg('ADD_USER',nom);closeModal();notify('Utilisateur cree','success');pgUtilisateurs(G('ct'));}
export async function delUser(id){if(!confirm('Supprimer ?'))return;await remove('users',id);pgUtilisateurs(G('ct'));}

// Modifier profil utilisateur

export function openEditUser(id) {
  var u = S.data.users.find(function(x){return x.id===id;});
  if (!u) return;
  openModal('<div class="mtt">Modifier Profil</div><div class="fg"><div class="fi"><label>Nom *</label><input id="eun" value="'+esc(u.nom||'')+'"></div><div class="fi"><label>Prenom</label><input id="eup" value="'+esc(u.prenom||'')+'"></div><div class="fi"><label>Email</label><input id="eue" type="email" value="'+esc(u.email||'')+'"></div><div class="fi"><label>Telephone</label><input id="eut" value="'+esc(u.telephone||'')+'"></div><div class="fi s2"><label>Adresse</label><input id="eua" value="'+esc(u.adresse||'')+'"></div></div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEditUser(\''+id+'\')','Enregistrer')+'</div>');
}

export async function saveEditUser(id) {
  var u = S.data.users.find(function(x){return x.id===id;});
  if (!u) return;
  var nom = gv('eun');
  if (!nom) { notify('Nom requis','error'); return; }
  await persist('users', Object.assign({}, u, { nom, prenom:gv('eup'), email:gv('eue'), telephone:gv('eut'), adresse:gv('eua') }));
  lg('MODIF_USER', nom);
  closeModal(); notify('Profil modifie','success'); pgUtilisateurs(G('ct'));
}

// Gestion des rôles & permissions

export var PERMS = {
  admin:      { membres:true, finances:true, budget:true, presences:true, utilisateurs:true, rapports:true, communication:true },
  pasteur:    { membres:true, finances:false, budget:false, presences:true, utilisateurs:false, rapports:true, communication:true },
  tresorier:  { membres:false, finances:true, budget:true, presences:false, utilisateurs:false, rapports:true, communication:false },
  secretaire: { membres:true, finances:false, budget:false, presences:true, utilisateurs:false, rapports:false, communication:true },
  membre:     { membres:false, finances:false, budget:false, presences:false, utilisateurs:false, rapports:false, communication:false },
};

export function openEditUserRole(id) {
  var u = S.data.users.find(function(x){return x.id===id;});
  if (!u) return;
  var roles = ['admin','pasteur','tresorier','secretaire','membre'];
  var opts = roles.map(function(r){return '<option value="'+r+'"'+(u.role===r?' selected':'')+'>'+r.charAt(0).toUpperCase()+r.slice(1)+'</option>';}).join('');
  var perms = PERMS[u.role] || PERMS.membre;
  var permRows = Object.keys(perms).map(function(k){
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--g2);font-size:.83rem"><span>'+k.charAt(0).toUpperCase()+k.slice(1)+'</span>'+
      (perms[k]?'<span style="color:var(--gn);font-weight:700">✓ Accès</span>':'<span style="color:var(--rd)">✗ Bloqué</span>')+'</div>';
  }).join('');
  openModal('<div class="mtt">Role & Permissions — '+esc(u.nom)+'</div><div class="fg"><div class="fi s2"><label>Role *</label><select id="eur" onchange="refreshPermsPreview(this.value)">'+opts+'</select></div></div><div id="perms-preview" style="background:var(--g1);border-radius:9px;padding:12px;margin:10px 0">'+permRows+'</div><div style="font-size:.78rem;color:var(--g4);margin-bottom:12px">Les permissions sont définies par le rôle.</div><div class="ma">'+BTN('bo','closeModal()','Annuler')+BTN('bg','saveEditUserRole(\''+id+'\')','Enregistrer')+'</div>');
}

export function refreshPermsPreview(role) {
  var perms = PERMS[role] || PERMS.membre;
  var permRows = Object.keys(perms).map(function(k){
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--g2);font-size:.83rem"><span>'+k.charAt(0).toUpperCase()+k.slice(1)+'</span>'+
      (perms[k]?'<span style="color:var(--gn);font-weight:700">✓ Accès</span>':'<span style="color:var(--rd)">✗ Bloqué</span>')+'</div>';
  }).join('');
  var preview = G('perms-preview');
  if (preview) preview.innerHTML = permRows;
}

export async function saveEditUserRole(id) {
  var u = S.data.users.find(function(x){return x.id===id;});
  if (!u) return;
  var role = gv('eur');
  await persist('users', Object.assign({}, u, { role }));
  lg('MODIF_ROLE', u.nom+' → '+role);
  closeModal(); notify('Role mis a jour','success'); pgUtilisateurs(G('ct'));
}

// ── RAPPORTS ──
