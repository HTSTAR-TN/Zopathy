// Tags remain shared post data; the first tag preserves the legacy topic field.
function normalizePostTags(value){
 const raw=Array.isArray(value)?value:String(value||'').split(',');
 const tags=[],seen=new Set();
 for(const entry of raw){const tag=String(entry||'').trim().replace(/^#+/,'').trim();if(!tag)continue;if([...tag].length>60||/[,\u0000-\u001f\u007f]/.test(tag))throw Error('Each tag must be 1–60 characters without commas or line breaks.');const key=tag.toLowerCase();if(!seen.has(key)){tags.push(tag);seen.add(key)}}
 if(tags.length>10)throw Error('Use up to 10 tags per post.');return tags;
}
function postTags(p){try{return normalizePostTags(Array.isArray(p.tags)?p.tags:[p.topic||'General'])}catch{return []}}
function postTagsButton(p){const tags=postTags(p);return tags.length?`<button type="button" class="post-tags-button" data-social-action="tags" data-id="${esc(p.id)}" aria-label="View ${tags.length} post ${tags.length===1?'tag':'tags'}">Tags <span>${tags.length}</span></button>`:''}
function showPostTags(id){const p=getPost(id);if(!p)return;openDialog(`<h2>Post tags</h2><p class="intro">Topics attached to this post.</p><div class="post-tag-list">${postTags(p).map(tag=>`<button type="button" class="secondary-btn" data-topic-search="${esc(tag)}">#${esc(tag)}</button>`).join('')}</div>`)}
function draftTagsField(){const value=draft.tagsText??(Array.isArray(draft.tags)?draft.tags:[draft.topic||'']).filter(Boolean).join(', ');return `<details class="composer-tags"><summary>Tags</summary><label class="field"><span>Up to 10 tags, separated by commas</span><input id="draft-tags" maxlength="650" value="${esc(value)}" placeholder="Gaming, music, design" aria-label="Post tags" aria-describedby="draft-tags-hint"></label><p class="upload-hint" id="draft-tags-hint">Optional · 60 characters per tag. The first tag is your primary topic.</p></details>`}
document.addEventListener('input',e=>{if(e.target.id==='draft-tags')draft.tagsText=e.target.value});
