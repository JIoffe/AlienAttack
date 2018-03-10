export class MapData{
    constructor(src, sectors, walls, playerPos, playerRotation, playerSectorIndex){
        var m = this;
        m.src = src;
        m.sectors = sectors;
        m.walls = walls;

        m.playerPos = playerPos;
        m.playerRotation = playerRotation;
        m.playerSectorIndex = playerSectorIndex;

        m.updateSectorSlopeReferences();
    }

    getWallNormal(index){
        let wall = this.walls[index],
            nextWall = this.walls[wall.point2];
        
        return wall.getNormal(nextWall);
    }
    
    updateSectorSlopeReferences(){
        this.sectors.forEach(sector => {
            let ref0 = this.walls[sector.wallptr],
                ref1 = this.walls[ref0.point2];

            sector.setSlopeReference(ref0, ref1);
        });
    }
}