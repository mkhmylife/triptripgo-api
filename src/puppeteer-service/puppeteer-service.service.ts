import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Browser,
  connect,
  ContinueRequestOverrides,
  HTTPRequest,
  Page,
} from 'puppeteer-core';

@Injectable()
export class PuppeteerService {
  constructor(private readonly configService: ConfigService) {}

  async getPuppeteer(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const browser = await connect({
      browserWSEndpoint: this.configService.get('BROWSERLESS_WS_URL'),
    });
    const page = await browser.newPage();
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //   if (req.resourceType() == 'font' || req.resourceType() == 'image') {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });
    return { browser, page };
  }

  async getPuppeteerProxy(): Promise<{
    browser: Browser;
    page: Page;
  }> {
    const browser = await connect({
      browserWSEndpoint: this.configService.get('BROWSERLESS_WS_URL_PROXY'),
    });
    const page = await browser.newPage();
    await page.authenticate({
      username: 'customer-kilowatt-sessid-0663315330-sesstime-30',
      password: 'Playa8964',
    });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() == 'font' || req.resourceType() == 'image') {
        req.abort();
      } else {
        req.continue();
      }
    });
    return { browser, page };
  }

  async gotoExtended(
    page: Page,
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      postData: any;
    },
  ) {
    const { url, method, headers, postData } = request;

    if (method !== 'GET' || postData || headers) {
      let wasCalled = false;
      await page.setRequestInterception(true);
      const interceptRequestHandler = async (request: HTTPRequest) => {
        try {
          if (wasCalled) {
            return await request.continue();
          }

          wasCalled = true;
          const requestParams: ContinueRequestOverrides = {};

          if (method !== 'GET') requestParams.method = method;
          if (postData) requestParams.postData = postData;
          if (headers) requestParams.headers = headers;
          await request.continue(requestParams);
          await page.setRequestInterception(false);
        } catch (error) {
          console.log(error);
        }
      };

      await page.on('request', interceptRequestHandler);
    }

    return page.goto(url);
  }
}
