const x11 = require("x11");
const {promisify} = require("util");

function clamp(min, n, max) {
    n = Math.max(min, n);
    n = Math.min(max, n);
    return n;
}

x11.createClient(async function(err, display) {
    const X = display.client;
    const root = display.screen[0].root;

    const queryPointer = promisify(X.QueryPointer.bind(X));
    const getFocus = promisify(X.GetInputFocus.bind(X));
    const getAttributes = promisify(X.GetWindowAttributes.bind(X));
    const getGeometry = promisify(X.GetGeometry.bind(X));
    const queryTree = promisify(X.QueryTree.bind(X));
    const timeout = promisify(setTimeout);

    async function getGeometryInRoot(window) {

        let ret = await getGeometry(window);

        while(true) {

            let qtRes = await queryTree(window);

            if(qtRes.root == qtRes.parent) {
                break;
            }

            window = qtRes.parent;

            let geo = await getGeometry(window);

            ret.xPos += geo.xPos;
            ret.yPos += geo.yPos;
        }

        return ret;
    }

    let i = 6;
    console.log("getting window in: ");

    while(--i > 0) {
        console.log(i);
        await timeout(1000);
    }

    let targetWindow = (await getFocus()).focus;

    console.log("locking mouse to window " + targetWindow + " while active");

    while (true) {
        let currentWindow = (await getFocus()).focus;

        if(currentWindow == targetWindow) {

            let geo = await getGeometryInRoot(targetWindow);

            let ptr = await queryPointer(root);

            let x = ptr.childX;
            let y = ptr.childY;

            let cx = clamp(geo.xPos, x, geo.xPos + geo.width);
            let cy = clamp(geo.yPos, y, geo.yPos + geo.height);

            if(cx != x || cy != y) {
                X.WarpPointer(0, root, 0, 0, 0, 0, cx, cy);
            }
        }

        await timeout(10);
    }
});

