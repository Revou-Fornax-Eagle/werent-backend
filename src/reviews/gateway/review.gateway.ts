import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface ProductRoomPayload {
  productId: string;
}

export interface ReviewCountUpdatePayload {
  productId: string;
  reviewCount: number;
}

@WebSocketGateway({ cors: true, namespace: '/' })
@Injectable()
export class ReviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ReviewGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinProductRoom')
  async joinProductRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ProductRoomPayload,
  ): Promise<{ productId: string; joined: true } | undefined> {
    if (!this.isValidProductId(payload?.productId)) {
      this.logger.warn(`Rejected join for invalid productId from ${client.id}`);
      return;
    }
    const roomName = this.roomName(payload.productId);
    await client.join(roomName);
    this.logger.log(`${client.id} joined ${roomName}`);

    return { productId: payload.productId, joined: true };
  }

  @SubscribeMessage('leaveProductRoom')
  leaveProductRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ProductRoomPayload,
  ): void {
    if (!this.isValidProductId(payload?.productId)) {
      return;
    }
    const roomName = this.roomName(payload.productId);
    client.leave(roomName);
    this.logger.log(`${client.id} left ${roomName}`);
  }

  /** Emits the updated review count to the product room (called post-commit). */
  emitReviewCountUpdate(productId: string, reviewCount: number): void {
    const roomName = this.roomName(productId);
    const eventPayload: ReviewCountUpdatePayload = { productId, reviewCount };
    this.server.to(roomName).emit('review_count_updated', eventPayload);
  }

  private roomName(productId: string): string {
    return `product:${productId}`;
  }

  private isValidProductId(productId: string | undefined | null): boolean {
    return typeof productId === 'string' && productId.length > 0;
  }
}
