package com.edocman.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class SystemConfigService {

    @Value("${stripe.simulation:true}")
    private boolean defaultStripeSimulation;

    @Value("${supabase.simulation:true}")
    private boolean defaultSupabaseSimulation;

    @Value("${resend.simulation:true}")
    private boolean defaultResendSimulation;



    private boolean stripeSimulation;
    private boolean supabaseSimulation;
    private boolean resendSimulation;

    @PostConstruct
    public void init() {
        this.stripeSimulation = defaultStripeSimulation;
        this.supabaseSimulation = defaultSupabaseSimulation;
        this.resendSimulation = defaultResendSimulation;
    }

    public boolean isStripeSimulation() { return stripeSimulation; }
    public void setStripeSimulation(boolean val) { this.stripeSimulation = val; }

    public boolean isSupabaseSimulation() { return supabaseSimulation; }
    public void setSupabaseSimulation(boolean val) { this.supabaseSimulation = val; }

    public boolean isResendSimulation() { return resendSimulation; }
    public void setResendSimulation(boolean val) { this.resendSimulation = val; }



    public Map<String, Boolean> getConfigMap() {
        Map<String, Boolean> configs = new HashMap<>();
        configs.put("stripeSimulation", stripeSimulation);
        configs.put("supabaseSimulation", supabaseSimulation);
        configs.put("resendSimulation", resendSimulation);
        return configs;
    }
}
