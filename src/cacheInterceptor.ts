import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { map, Observable, of } from 'rxjs';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, CACHE_TTL_METADATA } from '@nestjs/cache-manager';

const REFLECTOR = 'Reflector';

const SECONDS_TO_CACHE = 5 * 60;

@Injectable()
export class CacheInterceptor<T> implements NestInterceptor<T, T> {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly disableCache: boolean;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(REFLECTOR) protected readonly reflector: any,
    private readonly configService: ConfigService,
  ) {
    this.disableCache = this.configService.get('DISABLE_CACHE');
    if (this.disableCache) {
      this.logger.debug('Cache interceptor is disabled');
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheTTL =
      Number(this.reflector.get(CACHE_TTL_METADATA, context.getHandler())) ??
      SECONDS_TO_CACHE;

    if (this.disableCache || cacheTTL === 0) {
      return next.handle();
    }

    const request: Request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return next.handle();
    }

    const url = request.originalUrl;

    const cacheKey = `${CacheInterceptor.name}:${url}`;
    const cacheExpireKey = `${CacheInterceptor.name}:${url}:expiredAt`;

    const cachedContent = await this.cacheManager.get(cacheKey);
    const cachedContentExpiredAt = await this.cacheManager.get(cacheExpireKey);

    try {
      if (cachedContent) {
        // this.logger.debug(`Cache ${cacheKey} hit`);
        const isExpired = !cachedContentExpiredAt;
        if (isExpired) {
          setTimeout(() => {
            // this.logger.debug(`Cache ${cacheKey} expired`);
            const sub = next.handle().subscribe(
              (data) => {
                // this.logger.debug(`Cache ${cacheKey} updated`);
                this.cacheManager.set(cacheKey, data, 86400); // cache 1 day
                this.cacheManager.set(cacheExpireKey, true, cacheTTL);
                try {
                  sub.unsubscribe();
                } catch (e) {}
              },
              (error) => {
                if (error instanceof NotFoundException) {
                  this.cacheManager.del(cacheKey);
                  this.cacheManager.del(cacheExpireKey);
                } else {
                  console.error(error);
                }
              },
            );
          }, 1);
        }
        return of(cachedContent);
      }
    } catch (e) {
      this.logger.error(e);
    }

    // this.logger.debug(`Cache ${cacheKey} miss`);
    return next.handle().pipe(
      map((data) => {
        // this.logger.debug(`Cache ${cacheKey} set`);
        this.cacheManager.set(cacheKey, data, 86400); // cache 1 day
        this.cacheManager.set(cacheExpireKey, true, cacheTTL);
        // this.cacheManager.set(cacheExpireKey, moment().add(SECONDS_TO_CACHE, 'seconds'), { ttl: 604800000 });
        return data;
      }),
    );
  }
}
