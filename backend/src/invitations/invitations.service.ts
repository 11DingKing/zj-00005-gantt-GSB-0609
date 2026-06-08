import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto, AcceptInvitationDto } from './dto';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  private async checkProjectPermission(userId: string, projectId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (member.role !== Role.OWNER && member.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can send invitations');
    }
  }

  async create(userId: string, createInvitationDto: CreateInvitationDto) {
    await this.checkProjectPermission(userId, createInvitationDto.projectId);

    const existingMember = await this.prisma.projectMember.findFirst({
      where: {
        projectId: createInvitationDto.projectId,
        user: { email: createInvitationDto.email },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        projectId: createInvitationDto.projectId,
        email: createInvitationDto.email,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new BadRequestException('Invitation already sent to this email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        projectId: createInvitationDto.projectId,
        email: createInvitationDto.email,
        role: createInvitationDto.role || Role.MEMBER,
        token,
        invitedById: userId,
        expiresAt,
      },
      include: {
        project: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });

    console.log('\n=== MOCK EMAIL SENT ===');
    console.log(`To: ${invitation.email}`);
    console.log(`Subject: Invitation to join project: ${invitation.project.name}`);
    console.log(`Invitation Token: ${token}`);
    console.log(`Role: ${invitation.role}`);
    console.log(`Expires At: ${invitation.expiresAt}`);
    console.log('========================\n');

    return invitation;
  }

  async findAll(userId: string, projectId: string) {
    await this.checkProjectPermission(userId, projectId);

    return this.prisma.invitation.findMany({
      where: {
        projectId,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        project: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(userId: string, acceptInvitationDto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: acceptInvitationDto.token },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.accepted) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('This invitation is for a different email address');
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invitation.projectId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this project');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { accepted: true },
      });

      const member = await tx.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId,
          role: invitation.role,
        },
        include: {
          project: { select: { id: true, name: true } },
        },
      });

      return member;
    });
  }

  async remove(userId: string, id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.checkProjectPermission(userId, invitation.projectId);

    await this.prisma.invitation.delete({ where: { id } });

    return { message: 'Invitation cancelled successfully' };
  }
}
