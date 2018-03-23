let Twing = require('twing');

let fs = require('fs-extra');

let items = [
    {name: 'empty.twig', bigContext: false},
    {name: 'empty.twig', bigContext: true},
    {name: 'simple_attribute.twig', bigContext: false},
    {name: 'simple_array_access.twig', bigContext: false},
    {name: 'nested_array_access.twig', bigContext: false},
    {name: 'simple_method_access.twig', bigContext: false},
    {name: 'simple_method_access_optimized.twig', bigContext: false},
    {name: 'nested_method_access.twig', bigContext: false},
    {name: 'simple_attribute_big_context.twig', bigContext: true},
    {name: 'simple_variable.twig', bigContext: false},
    {name: 'simple_variable_big_context.twig', bigContext: true},
    {name: 'simple_foreach.twig', bigContext: false},
    {name: 'simple_foreach.twig', bigContext: true},
    {name: 'empty_extends.twig', bigContext: false},
    {name: 'empty_extends.twig', bigContext: true},
    {name: 'empty_include.twig', bigContext: false},
    {name: 'empty_include.twig', bigContext: true},
    {name: 'standard.twig', bigContext: false},
    {name: 'escaping.twig', bigContext: false}
];

let longestNameLength = 0;

for (let item of items) {
    if ((item.name.length + 2) > longestNameLength) {
        longestNameLength = (item.name.length + 2);
    }
}

class TmpObj {
    getFoo() {
        return 'foo';
    }
}

class NestedTmpObj {
    constructor(nested) {
        this.nested = nested;
    }

    getFoo() {
        return this.nested;
    }
}

let benchmark = function (type, iterations = 100000) {
    for (let item of items) {
        let name = item.name;
        let bigContext = item.bigContext;

        let vars;

        if (bigContext) {
            vars = {
                bar: {}
            };

            for (let i = 1; i < 10000; i++) {
                vars['foo' + i] = i;
            }

            for (let i = 1; i < 10000; i++) {
                vars['bar']['foo' + i] = i;
            }
        }
        else {
            vars = {
                'foo': 'foo',
                'nested': {'bar': {'baz': {'foobar': 'foobar'}}},
                'bar': {'foo': 'foo'},
                'obj': new TmpObj(),
                'nested_obj': new NestedTmpObj(new NestedTmpObj(new NestedTmpObj(new TmpObj()))),
                'items': ['foo1', 'foo2', 'foo3', 'foo4', 'foo5', 'foo6', 'foo7', 'foo8', 'foo9', 'foo10'],
            };
        }

        let start = process.hrtime();

        let loader = new Twing.TwingLoaderFilesystem('./templates');

        let twing = new Twing.TwingEnvironment(loader, {
            cache: 'cache',
            debug: false,
            auto_reload: false,
            autoescape: false,
            strict_variables: false
        });

        let logName = name.replace('.twig', '') + (bigContext ? '/B' : '');

        let log = `${logName}${' '.repeat(longestNameLength - logName.length)} | xxx`;

        // without the cache
        let template = twing.loadTemplate(name);

        let diff = process.hrtime(start);
        let hrDiff = diff[0] * 1e9 + diff[1]; // nanoseconds

        log += ' ' + Math.round(hrDiff / 1000000 * 100) / 100;

        let min = Number.MAX_SAFE_INTEGER;

        for (let j = 0; j < 5; j++) {
            // with the cache
            start = process.hrtime();

            for (let i = 0; i < 500; i++) {
                Twing.TwingOutputBuffering.obStart();
                template.display(vars);
                Twing.TwingOutputBuffering.obGetClean();
            }

            diff = process.hrtime(start);
            hrDiff = diff[0] * 1e9 + diff[1]; // nanoseconds

            if (hrDiff < min) {
                min = hrDiff;
            }
        }

        log += ' ' + Math.round(hrDiff / 1000000 * 100) / 100 + ' |';

        console.warn(log);
    }
};

fs.removeSync('./cache');

benchmark('Twig');
benchmark('Twing');