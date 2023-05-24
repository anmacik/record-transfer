import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import express, { Express, Request, Response } from 'express';
import https from 'https';
import bodyParser from 'body-parser';
import request from 'request';
import axios from 'axios';

import { GoogleDriveService } from './googleDriveService';
const app: Express = express();
app.use(bodyParser.json());
dotenv.config();

const port = process.env.PORT;
const driveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const driveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const driveRedirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || '';
const driveRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

const googleDriveService =  new GoogleDriveService(driveClientId, driveClientSecret, driveRedirectUri, driveRefreshToken);
var count = 0;
app.post('/', async (req: Request, res: Response) => {
  let flName=count;
  count++;
  console.log('new file', req.body.url)
  dlFile(req.body.url, flName).then(async ()=>{
  const finalPath = path.resolve(__dirname, '../public/'+flName+'.mp3');
  const folderName = 'records';
  let folder = await googleDriveService.searchFolder(folderName).catch((error) => {
    console.error(error);
    return null;
  });

  if (!folder) {
    folder = await googleDriveService.createFolder(folderName);
  }
  var respond = await googleDriveService.saveFile(`${req.body.url}`, finalPath, '[*/*]', folder.id).catch((error) => {
    console.error(error);
  });
  fs.unlinkSync(finalPath);
  res.send({url:'https://drive.google.com/file/d/'+respond.data.id});
  })
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
const dlFile = async (url:string, fileName) =>{
  const writer = fs.createWriteStream('./public/'+fileName+'.mp3');
  return axios({
    method: 'get',
    url: url,
    responseType: 'stream',
  }).then(response =>{
    return new Promise((resolve, reject)=>{
      response.data.pipe(writer);
      let error=null;
      writer.on('error', err=>{
        writer.close();
        reject(err);
        console.log(err)
      });
      writer.on('close',()=>{
        if (!error){
          resolve(true);
        }
      })
    })
  })
}

