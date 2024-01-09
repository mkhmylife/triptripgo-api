import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { decode } from 'html-entities';
import {
  WP_REST_API_Attachments,
  WP_REST_API_Post,
  WP_REST_API_Posts,
  WP_REST_API_Terms,
} from 'wp-types';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from "axios";

@Injectable()
export class BlogService {
  constructor(private readonly httpService: HttpService) {}

  private static convertWPPostToBlogpost(
    post: WP_REST_API_Post,
    showContent: boolean,
  ) {
    const featuredImageUrl =
      post['_embedded'] &&
      post['_embedded']['wp:featuredmedia'] &&
      post['_embedded']['wp:featuredmedia'].length > 0
        ? (post['_embedded']['wp:featuredmedia'] as WP_REST_API_Attachments)[0]
            .source_url
        : null;

    const blogImageUrl =
      post['blogFeaturedMedia'] && (post['blogFeaturedMedia'] as any).length > 0
        ? post['blogFeaturedMedia'][0].full
        : null;

    const terms: WP_REST_API_Terms | [] =
      post['_embedded'] &&
      post['_embedded']['wp:term'] &&
      post['_embedded']['wp:term'].length > 0
        ? (post['_embedded']['wp:term'][0] as WP_REST_API_Terms)
        : [];
    const terms2: WP_REST_API_Terms | [] =
      post['_embedded'] &&
      post['_embedded']['wp:term'] &&
      post['_embedded']['wp:term'].length > 1
        ? (post['_embedded']['wp:term'][1] as WP_REST_API_Terms)
        : [];

    const categories = terms
      .filter((term) => {
        return term.taxonomy === 'category';
      })
      .map((term) => {
        return {
          id: term.id,
          slug: term.slug,
          name: term.name,
        };
      });

    const tags = terms2
      .filter((term) => {
        return term.taxonomy === 'post_tag';
      })
      .map((term) => {
        return {
          id: term.id,
          slug: term.slug,
          name: term.name,
        };
      });

    return {
      id: post.id,
      slug: post.slug,
      title: decode(post.title.rendered),
      content: showContent ? post.content.rendered.replace(/\n/g, '') : '',
      excerpt: post.excerpt.rendered
        .replace(/<[^>]*>?/gm, '')
        .replace('[&hellip;]', ''),
      originalImageUrl: featuredImageUrl,
      imageUrl: `https://www.triptripgo.hk/_next/image?url=${encodeURIComponent(
        featuredImageUrl,
      )}&w=1080&q=75`,
      blogImageUrl: blogImageUrl,
      url: `https://www.triptripgo.hk/news/${post.id}-${post.slug}`,
      carParkIds: post.carparkId
        ? (post.carparkId as string).split(',').map((id) => Number(id))
        : undefined,
      chargerGroupId: post.chargerGroupId
        ? Number(post.chargerGroupId)
        : undefined,
      roadTripId: post.roadTripId ? Number(post.roadTripId) : undefined,
      categories,
      tags,
      date_gmt: post.date_gmt,
      modified_gmt: post.modified_gmt,
      canonicalUrl: post.canonical_url,
      youtubeVideoId: post.youtubeVideoId || undefined,
    };
  }

  async getBlogArticle(id: number) {
    try {
      const { data }: { data: WP_REST_API_Post } = await this.httpService
        .get(`https://cms.triptripgo.hk/wp-json/wp/v2/posts/${id}?_embed=1`)
        .toPromise();
      return BlogService.convertWPPostToBlogpost(data, true);
    } catch (e) {
      if (e.isAxiosError) {
        if ((e as AxiosError).response.status === 404) {
          throw new NotFoundException();
        }
        if ((e as AxiosError).response.status === 400) {
          throw new BadRequestException();
        }
      }
      throw e;
    }
  }
}
