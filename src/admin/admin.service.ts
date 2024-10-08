import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LabInformationEntity } from 'src/entities/lab-info.entity';
import { LabEntity, ApprovalStatus } from 'src/entities/lab.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(LabEntity)
    private readonly labRepository: Repository<LabEntity>,
    @InjectRepository(LabInformationEntity)
    private readonly labInformationRepository: Repository<LabInformationEntity>,
  ) { }

  async cancelRentalLab(userId: string) {
    const lab = await this.labRepository.findOne({
      where: { userId: userId },
    });

    if (!lab) {
      throw new NotFoundException(`사용자 ID ${userId}에 해당하는 대여 실험실을 찾을 수 없습니다.`);
    } else {
      console.log(lab);
    }

    const labInfo = await this.labInformationRepository.findOne({
      where: { labName: lab.hopeLab },
    });

    const deleteLab = await this.labRepository.delete({
      userId: userId,
    });

    if (labInfo) {
      await this.labInformationRepository.remove(labInfo);
    }

    return { affected: deleteLab?.affected, labInfo };
  }

  async permitRentalLab(userId: string) {
    const lab = await this.labRepository.findOne({
      where: { userId: userId },
    });

    if (!lab) {
      throw new NotFoundException(`사용자 ID ${userId}에 해당하는 대여 실험실을 찾을 수 없습니다.`);
    } else {
      console.log(lab);
    }

    if (!lab.hopeLab) {
      throw new InternalServerErrorException(`사용자 ID ${userId}의 대여 요청에서 hopeLab이 null입니다.`);
    }

    const permitResult = await this.labRepository.update(
      { userId: userId },
      { approvalStatus: ApprovalStatus.APPROVED },
    );

    const labInfo = this.labInformationRepository.create({
      labName: lab.hopeLab,
      Available: 1,
      userId: lab.userId,
      rentalPurpose: lab.rentalPurpose,
      rentalUser: lab.rentalUser,
      rentalStartTime: lab.rentalStartTime,
      rentalDate: lab.rentalDate
    });

    const saveInfo = await this.labInformationRepository.save(labInfo);

    return { affected: permitResult?.affected, saveInfo };
  }

  async getApprovalRequest(): Promise<LabEntity[]> {
    return this.labRepository.find({
      where: {
        approvalStatus: ApprovalStatus.APPROVALWAITING,
      },
    });
  }

  async getDeletionRequest(): Promise<LabEntity[]> {
    return this.labRepository.find({
      where: {
        approvalStatus: ApprovalStatus.DELETIONWAITING
      }
    })
  }
}
