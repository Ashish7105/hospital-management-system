// src/migrations/FixDoctorUniqueConstraint.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDoctorUniqueConstraint1692123456789 implements MigrationInterface {
    name = 'FixDoctorUniqueConstraint1692123456789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Allow NULL values in appointments.doctorId column
        await queryRunner.query(`
            ALTER TABLE \`appointments\` 
            MODIFY COLUMN \`doctorId\` INT NULL
        `);
        
        // Step 2: Check if the problematic index exists before trying to drop it
        const indexExists = await queryRunner.query(`
            SELECT COUNT(*) as count FROM information_schema.statistics 
            WHERE table_schema = 'clinic_db' 
            AND table_name = 'doctors' 
            AND index_name = 'IDX_88e33c8ebf0cce499b9d5d25c6'
        `);
        
        if (indexExists[0].count > 0) {
            try {
                await queryRunner.query(`ALTER TABLE \`doctors\` DROP INDEX \`IDX_88e33c8ebf0cce499b9d5d25c6\``);
            } catch (error) {
                console.log('Index already dropped or does not exist');
            }
        }
        
        // Step 3: Now safely update appointments with duplicate doctor references
        await queryRunner.query(`
            UPDATE appointments 
            SET doctorId = NULL 
            WHERE doctorId IN (
                SELECT DISTINCT d1.id 
                FROM doctors d1 
                INNER JOIN doctors d2 ON d1.phone = d2.phone AND d1.id > d2.id 
                WHERE d1.phone = ''
            )
        `);
        
        // Step 4: Delete duplicate empty phone doctors
        await queryRunner.query(`
            DELETE d1 FROM doctors d1
            INNER JOIN doctors d2 
            WHERE d1.id > d2.id 
            AND d1.phone = d2.phone 
            AND d1.phone = ''
        `);
        
        // Step 5: Convert remaining empty strings to NULL
        await queryRunner.query(`UPDATE doctors SET phone = NULL WHERE phone = ''`);
        await queryRunner.query(`UPDATE doctors SET email = NULL WHERE email = ''`);
        
        // Step 6: Create proper unique constraint that allows NULL
        await queryRunner.query(`
            ALTER TABLE \`doctors\` 
            ADD CONSTRAINT \`UQ_DOCTOR_PHONE\` UNIQUE (\`phone\`)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`ALTER TABLE \`doctors\` DROP CONSTRAINT \`UQ_DOCTOR_PHONE\``);
        await queryRunner.query(`UPDATE doctors SET phone = '' WHERE phone IS NULL`);
        await queryRunner.query(`UPDATE doctors SET email = '' WHERE email IS NULL`);
        
        // Restore NOT NULL constraint on appointments.doctorId if needed
        await queryRunner.query(`
            ALTER TABLE \`appointments\` 
            MODIFY COLUMN \`doctorId\` INT NOT NULL
        `);
    }
}
