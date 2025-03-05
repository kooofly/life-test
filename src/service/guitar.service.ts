import { Provide } from '@midwayjs/core';
import * as fs from 'fs';
import * as path from 'path';

@Provide()
export class GuitarService {
    async getGuitarAll() {
        const list = []
        travel(path.join(process.cwd(), "/public/pic"), function (pathname, file) {
            list.push(file)
        })
        return list;
    }
}


function travel(dir, callback) {
    fs.readdirSync(dir).forEach((file) => {
        var pathname = path.join(dir, file)
        if (fs.statSync(pathname).isDirectory()) {
            travel(pathname, callback)
        } else {
            callback(pathname, file)
        }
    })
}