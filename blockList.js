import Block, { FixedShelf, PullShelf } from './blocks/block.js';
import PullDesk from './blocks/pullDesk.js';
import PlasticBin from './blocks/plasticBin.js';
import FixedDesk from './blocks/fixedDesk.js';
import PullRack from './blocks/pullRack.js';
import Drawer from './blocks/drawer.js';
import DisplayRack from './blocks/displayRack.js';
import ShippingStation from './blocks/shippingStation.js';
import SurfRack from './blocks/surfRack.js';
import MiterStation from './blocks/miterStation.js';
import PullUpBar from './blocks/pullUpBar.js';
import ShoeRack from './blocks/shoeRack.js';
import CubeShelf from './blocks/cubeShelf.js';
import VerticalBike from './blocks/verticalBike.js';

export default class BlockList {
    constructor() {
    }

    static baseBlockList() {
        return [PullDesk, FixedDesk, PullRack,ShippingStation,SurfRack, MiterStation,PullUpBar, VerticalBike,FixedShelf, PullShelf, PlasticBin, Drawer, DisplayRack, ShoeRack, CubeShelf]
    }

    static fromJSON(sceneManager,shelf,column,data) {
        /* find which Block this should be */
        let variationName = data.variationName;
        let blockList = BlockList.baseBlockList();
        for (var block in blockList) {
            for (var variation in blockList[block].parameters().variations) {
                if (blockList[block].parameters().variations[variation].variationName == variationName) {
                    let newBlock = new blockList[block](sceneManager,shelf,variationName)
                    .setColumn(column)
                    .setZIndex(data.zIndex)
                    .update()
                    .addToShelfFilling()
                    return newBlock;
                }
            }
        }
    }
}