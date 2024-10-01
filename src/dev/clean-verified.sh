cat out.json | jq -c '.[] | {name: .title, id: .slug}' > clean.out
