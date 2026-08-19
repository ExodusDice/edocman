package com.edocman.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseSchemaInitializer {

    @Bean
    public CommandLineRunner initDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            System.out.println("--- Running Safe Database Schema Initializer ---");
            String[] sqlStatements = {
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS banned boolean DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason text",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_sms boolean DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_totp boolean DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_line boolean DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_passkey boolean DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_email boolean DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret varchar(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role_title varchar(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS department varchar(255)",
                "ALTER TABLE legal_service_orders ADD COLUMN IF NOT EXISTS official_document_url text",
                "ALTER TABLE legal_service_orders ADD COLUMN IF NOT EXISTS staff_note text"
            };

            for (String sql : sqlStatements) {
                try {
                    jdbcTemplate.execute(sql);
                } catch (Exception e) {
                    System.err.println("Schema update notice for [" + sql + "]: " + e.getMessage());
                }
            }
            System.out.println("--- Safe Database Schema Initializer Completed ---");
        };
    }
}
