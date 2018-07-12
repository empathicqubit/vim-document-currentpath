#! /usr/bin/env node

const jsonAst = require('json-ast');
const getStdin = require('get-stdin');
const sax = require('sax');

const handleAst = (node, nodeList) => {
    nodeList = nodeList || [];

    if(!node) return;
    if(node.position && node.position.start && node.position.end) {
        nodeList.push(node);
    }

    switch(node.type) {
        case 'document':
            handleAst(node.child, nodeList);
            break;
        case 'object':
            node.properties.forEach(p => handleAst(p, nodeList));
            break;
        case 'array':
            node.items.forEach((p, i) => {
                p.propertyName = `[${i}]`;
                handleAst(p, nodeList);
            });
            break;
        case 'property':
             node.value.propertyName = node.key.value;
             node.key.propertyName = node.key.value;
             [node.key, node.value].forEach(p => handleAst(p, nodeList));
             break;
    }

    return nodeList;
};

const getJsonPath = (pos) => {
    return getStdin()
        .then(data => {
            const ast = jsonAst.parse(data);

            const nodeList = handleAst(ast);

            const possibles = nodeList.filter(x => x.position.start.char <= pos && x.position.end.char >= pos);

            const jsonPath = possibles.map(x => x.propertyName).join('.');

            console.log(jsonPath);
        });
}

const getXPath = (pos) => {
    return new Promise((res, rej) => {
        const parser = sax.createStream(false);

        let tags = [];

        parser.on('error', rej);

        parser.on('opentag', tag => {
            try {
                tags.unshift(tag);
            }
            catch (e) {
                return rej(e);
            }
        });

        parser.on('closetag', tag => {
            try {
                if(tag.sourceCodeLocation.startOffset > pos) {
                    parser.end();

                    tags.reverse();

                    console.log(tags.map(t => {
                        let classes = t.attrs.find(a => /^class$/i.test(a.name));
                        classes = ( classes && ( '.' + classes.value.replace(/\s+/g, '.') ) ) || '';

                        let id = t.attrs.find(a => /^id$/i.test(a.name));
                        id = (id && ('#' + id.value)) || '';

                        return `${t.tagName}${id}${classes}`
                    }).join('/'))

                    return res();
                }

                const idx = tags.findIndex(t => t.tagName == tag.tagName && !t.selfClosing);
                tags.splice(idx, 1);
            }
            catch(e) {
                return rej(e);
            }
        });

        process.stdin.pipe(parser);
    });
}

Promise.resolve()
    .then(() => {
        const pos = parseInt(process.argv[2]);
        const filetype = process.argv[3];

        switch(filetype) {
            case 'xml':
            case 'html':
                return getXPath(pos);

            case 'json':
            default:
                return getJsonPath(pos);
        }

    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
