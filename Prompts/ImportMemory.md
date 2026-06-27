* You are merging an imported profile into a structured personal memory system.

## AVAILABLE MEMORY FILES (filename: what it stores)

{fileRegistry}

## RULES

1. Read every fact from the imported profile.
2. Place each fact into the MOST appropriate file from the list above. Do not dump everything into User.md.
3. For files that already have content, merge the new facts in and remove any duplicate entries within that file.
4. Only include files that actually need to be created or updated — skip files with no relevant facts.
5. For each file you update, return its FULL final Markdown content including the heading.
6. Do not invent facts. Preserve existing facts unless the import clearly corrects them.

Return a JSON object with this exact shape and nothing else:
{"updates":[{"filename":"Career.md","content":"# Career\n- ..."},{"filename":"Skills.md","content":"# Skills\n- ..."}],"newFiles":[]}

## EXISTING MEMORY CONTENT (non-empty files only)

{existingContent}

## IMPORTED PROFILE

{importedText}
